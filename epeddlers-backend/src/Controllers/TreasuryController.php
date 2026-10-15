<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\ActivityLog;
use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;
use ePeddlers\Workflow;

final class TreasuryController
{
    // --- Dashboard ---------------------------------------------------------
    public function dashboard(): void
    {
        Auth::requirePermission('treasury.reports');
        $pdo = Database::connect();

        $byStatus = [];
        foreach ($pdo->query('SELECT status, COUNT(*) c FROM applications GROUP BY status') as $r) {
            $byStatus[$r['status']] = (int)$r['c'];
        }
        $sum = static fn(array $k) => array_sum(array_map(fn($s) => $byStatus[$s] ?? 0, $k));

        $paid = (int)$pdo->query("SELECT COUNT(DISTINCT application_id) FROM payment_records WHERE status='verified'")->fetchColumn();
        $totalApps = array_sum($byStatus);

        $coll = $pdo->query("SELECT COALESCE(SUM(amount),0) t, COUNT(*) c FROM collection_transactions WHERE status='success'")->fetch();

        $satDate = $this->weekAnchor();
        $sat = $pdo->prepare("SELECT COALESCE(SUM(amount),0) t, COUNT(*) c FROM collection_transactions WHERE status='success' AND collection_week = :w");
        $sat->execute([':w' => $satDate]);
        $satRow = $sat->fetch();

        $recent = $pdo->query(
            "SELECT ct.txn_ref, ct.amount, ct.collected_at, pe.full_name AS peddler, u.full_name AS officer
             FROM collection_transactions ct
             JOIN peddlers pe ON pe.id = ct.peddler_id
             JOIN users u ON u.id = ct.collected_by
             WHERE ct.status='success' ORDER BY ct.id DESC LIMIT 10"
        )->fetchAll();

        Response::ok([
            'total_applicants' => $totalApps,
            'paid_applications' => $paid,
            'unpaid_applications' => $sum(['awaiting_payment', 'payment_verification_pending']),
            'awaiting_verification' => $sum(['payment_verification_pending']),
            'total_collections' => (float)$coll['t'],
            'total_collection_count' => (int)$coll['c'],
            'saturday_week' => $satDate,
            'saturday_total' => (float)$satRow['t'],
            'saturday_count' => (int)$satRow['c'],
            'recent_collections' => $recent,
        ]);
    }

    // --- Applicants (search by application id / name) ----------------------
    public function applicants(): void
    {
        Auth::requirePermission('treasury.verify');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $search = trim((string)Request::query('search', ''));
        $type = trim((string)Request::query('type', ''));

        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = '(a.application_code LIKE :s1 OR a.applicant_name LIKE :s2)';
            $params[':s1'] = "%$search%";
            $params[':s2'] = "%$search%";
        }
        if (in_array($type, ['new', 'renewal'], true)) {
            $where[] = 'a.type = :ty';
            $params[':ty'] = $type;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $count = $pdo->prepare("SELECT COUNT(*) FROM applications a $whereSql");
        $count->execute($params);
        $total = (int)$count->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT a.id, a.application_code, a.type, a.applicant_name, a.status,
                    (SELECT COALESCE(SUM(amount),0) FROM application_charges WHERE application_id = a.id) AS total_charges,
                    (SELECT COUNT(*) FROM payment_records WHERE application_id = a.id AND status='verified') AS verified_payments
             FROM applications a $whereSql ORDER BY a.created_at DESC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }

    /** Payment detail for one application: charges + payment records + verifications. */
    public function paymentDetail(array $p): void
    {
        Auth::requirePermission('treasury.verify');
        $pdo = Database::connect();
        $appId = $this->resolveApp($pdo, (string)$p['id']);

        $app = $pdo->prepare('SELECT id, application_code, applicant_name, type, status FROM applications WHERE id = :id');
        $app->execute([':id' => $appId]);
        $application = $app->fetch();

        $charges = $pdo->prepare('SELECT ac.*, fc.name AS fee_name FROM application_charges ac JOIN fee_categories fc ON fc.id = ac.fee_category_id WHERE ac.application_id = :id');
        $charges->execute([':id' => $appId]);

        $payments = $pdo->prepare(
            'SELECT pr.*, u.full_name AS recorded_by_name FROM payment_records pr
             LEFT JOIN users u ON u.id = pr.recorded_by WHERE pr.application_id = :id ORDER BY pr.id DESC'
        );
        $payments->execute([':id' => $appId]);
        $paymentRows = $payments->fetchAll();

        foreach ($paymentRows as &$pay) {
            $vs = $pdo->prepare('SELECT pv.*, u.full_name AS verifier FROM payment_verifications pv JOIN users u ON u.id = pv.verified_by WHERE pv.payment_id = :pid ORDER BY pv.id DESC');
            $vs->execute([':pid' => $pay['id']]);
            $pay['verifications'] = $vs->fetchAll();
        }
        unset($pay);

        Response::ok([
            'application' => $application,
            'charges' => $charges->fetchAll(),
            'payments' => $paymentRows,
        ]);
    }

    /**
     * Verify (or correct) a payment. Creates a payment record if none exists.
     * All actions are auditable; corrections are recorded as reversing verifications.
     */
    public function verify(array $p): void
    {
        $actor = Auth::requirePermission('treasury.verify');
        $v = Request::validate([
            'result' => 'required|in:verified,rejected,reversed',
            'amount' => 'numeric',
        ]);
        $pdo = Database::connect();
        $appId = $this->resolveApp($pdo, (string)$p['id']);

        $appStmt = $pdo->prepare('SELECT * FROM applications WHERE id = :id');
        $appStmt->execute([':id' => $appId]);
        $app = $appStmt->fetch();
        if (!$app) {
            Response::error(404, 'NOT_FOUND', 'Application not found.');
        }

        try {
            $pdo->beginTransaction();

            // Find or create a payment record.
            $pay = $pdo->prepare('SELECT * FROM payment_records WHERE application_id = :id ORDER BY id DESC LIMIT 1');
            $pay->execute([':id' => $appId]);
            $payment = $pay->fetch();

            if (!$payment) {
                $amount = isset($v['amount']) ? (float)$v['amount']
                    : (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM application_charges WHERE application_id = $appId")->fetchColumn();
                $ref = Support::randomCode('PAY', 10);
                $pdo->prepare(
                    'INSERT INTO payment_records (payment_ref, application_id, amount, status, recorded_by, paid_at)
                     VALUES (:ref, :app, :amt, :st, :by, UTC_TIMESTAMP())'
                )->execute([
                    ':ref' => $ref, ':app' => $appId, ':amt' => $amount,
                    ':st' => $v['result'], ':by' => $actor['id'],
                ]);
                $paymentId = (int)$pdo->lastInsertId();
            } else {
                $paymentId = (int)$payment['id'];
                $pdo->prepare('UPDATE payment_records SET status = :st WHERE id = :id')
                    ->execute([':st' => $v['result'], ':id' => $paymentId]);
            }

            // Record the verification action (auditable; a correction references the prior one).
            $reversesId = Request::input('reverses_id');
            $pdo->prepare(
                'INSERT INTO payment_verifications (payment_id, result, verified_by, remarks, reverses_id)
                 VALUES (:pid, :res, :by, :rem, :rev)'
            )->execute([
                ':pid' => $paymentId, ':res' => $v['result'], ':by' => $actor['id'],
                ':rem' => Request::input('remarks'), ':rev' => $reversesId ?: null,
            ]);

            // If verified and the app is awaiting payment, advance the workflow (payment clearance).
            if ($v['result'] === 'verified' && in_array($app['status'], ['awaiting_payment', 'payment_verification_pending'], true)) {
                if ($app['status'] === 'awaiting_payment') {
                    Workflow::transition($pdo, $appId, 'awaiting_payment', 'payment_verification_pending',
                        (int)$actor['id'], 'treasury', 'Payment recorded.', true);
                }
                Workflow::transition($pdo, $appId, 'payment_verification_pending', 'payment_cleared',
                    (int)$actor['id'], 'treasury', 'Payment verified by treasury.', true);
                // Payment clearance distinct from final approval: move to ready for final approval.
                Workflow::transition($pdo, $appId, 'payment_cleared', 'ready_for_final_approval',
                    (int)$actor['id'], 'treasury', 'Cleared for final approval.', true);
                \ePeddlers\Notify::toPermission($pdo, 'applications.approve', 'ready_for_approval',
                    'Ready for final approval', $app['application_code'] . ' has cleared payment.',
                    $appId, '/admin/applications');
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'payment.verify', 'application', (string)$appId,
            null, ['result' => $v['result']]);
        Response::ok(['message' => 'Payment ' . $v['result'] . '.', 'result' => $v['result']]);
    }

    // --- Collections view & reconciliation ---------------------------------
    public function collections(): void
    {
        Auth::requirePermission('treasury.reports');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $search = trim((string)Request::query('search', ''));
        $week = trim((string)Request::query('week', ''));
        $status = trim((string)Request::query('status', ''));

        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = '(ct.txn_ref LIKE :s1 OR pe.full_name LIKE :s2)';
            $params[':s1'] = "%$search%";
            $params[':s2'] = "%$search%";
        }
        if ($week !== '') {
            $where[] = 'ct.collection_week = :week';
            $params[':week'] = $week;
        }
        if (in_array($status, ['success', 'voided', 'reversed', 'pending'], true)) {
            $where[] = 'ct.status = :st';
            $params[':st'] = $status;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $count = $pdo->prepare("SELECT COUNT(*) FROM collection_transactions ct JOIN peddlers pe ON pe.id = ct.peddler_id $whereSql");
        $count->execute($params);
        $total = (int)$count->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT ct.id, ct.txn_ref, ct.amount, ct.status, ct.collected_at, ct.collection_week,
                    pe.full_name AS peddler_name, fc.name AS fee_name, u.full_name AS officer
             FROM collection_transactions ct
             JOIN peddlers pe ON pe.id = ct.peddler_id
             JOIN fee_categories fc ON fc.id = ct.fee_category_id
             JOIN users u ON u.id = ct.collected_by
             $whereSql ORDER BY ct.id DESC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }

    /** Reverse a collection with a reason (auditable, does not delete history). */
    public function reverseCollection(array $p): void
    {
        $actor = Auth::requirePermission('treasury.reports');
        $v = Request::validate(['reason' => 'required|string|max:500']);
        $pdo = Database::connect();

        $stmt = $pdo->prepare('SELECT * FROM collection_transactions WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $txn = $stmt->fetch();
        if (!$txn) {
            Response::error(404, 'NOT_FOUND', 'Transaction not found.');
        }
        if ($txn['status'] !== 'success') {
            Response::error(422, 'INVALID_STATE', 'Only successful transactions can be reversed.');
        }

        try {
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE collection_transactions SET status = 'reversed' WHERE id = :id")
                ->execute([':id' => $p['id']]);
            $pdo->prepare('INSERT INTO collection_reversals (transaction_id, reason, reversed_by) VALUES (:t, :r, :by)')
                ->execute([':t' => $p['id'], ':r' => $v['reason'], ':by' => $actor['id']]);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'collection.reverse', 'collection', (string)$p['id'],
            ['status' => 'success'], ['status' => 'reversed', 'reason' => $v['reason']]);
        Response::ok(['message' => 'Transaction reversed.']);
    }

    // --- Saturday-only weekly report ---------------------------------------
    public function weeklyReport(): void
    {
        Auth::requirePermission('treasury.reports');
        $pdo = Database::connect();

        // Historical viewing allowed any day; generation/finalization is Saturday-only (see generateWeekly).
        $week = trim((string)Request::query('week', '')) ?: $this->weekAnchor();

        $stmt = $pdo->prepare(
            "SELECT ct.collected_at, ct.txn_ref, pe.full_name AS peddler, a.application_code,
                    ct.amount, fc.name AS category, u.full_name AS officer, ct.status
             FROM collection_transactions ct
             JOIN peddlers pe ON pe.id = ct.peddler_id
             LEFT JOIN applications a ON a.id = ct.application_id
             JOIN fee_categories fc ON fc.id = ct.fee_category_id
             JOIN users u ON u.id = ct.collected_by
             WHERE ct.collection_week = :week
             ORDER BY ct.collected_at ASC"
        );
        $stmt->execute([':week' => $week]);
        $rows = $stmt->fetchAll();

        $totals = ['success' => 0.0, 'voided' => 0.0, 'reversed' => 0.0, 'pending' => 0.0];
        foreach ($rows as $r) {
            $totals[$r['status']] = ($totals[$r['status']] ?? 0) + (float)$r['amount'];
        }

        Response::ok([
            'week' => $week,
            'generated_at' => Support::nowUtc(),
            'rows' => $rows,
            'totals' => $totals,
            'is_saturday_today' => $this->isReportDay(),
        ]);
    }

    /** Enforce Saturday-only generation/finalization in La Carlota local time. */
    public function generateWeekly(): void
    {
        $actor = Auth::requirePermission('treasury.reports');
        if (!$this->isReportDay()) {
            Response::error(422, 'NOT_REPORT_DAY',
                'Official weekly reports can only be generated/finalized on the configured report day (Saturday, La Carlota time).');
        }
        // Finalizing is the same data as viewing; here we simply log the official generation.
        $week = $this->weekAnchor();
        ActivityLog::record((int)$actor['id'], 'treasury.report.generate', 'weekly_report', $week, null, ['week' => $week]);
        $this->weeklyReport();
    }

    // --- helpers -----------------------------------------------------------
    private function resolveApp(\PDO $pdo, string $idOrCode): int
    {
        if (is_numeric($idOrCode)) {
            return (int)$idOrCode;
        }
        $stmt = $pdo->prepare('SELECT id FROM applications WHERE application_code = :c');
        $stmt->execute([':c' => $idOrCode]);
        $id = $stmt->fetchColumn();
        if ($id === false) {
            Response::error(404, 'NOT_FOUND', 'Application not found.');
        }
        return (int)$id;
    }

    private function tz(): \DateTimeZone
    {
        return new \DateTimeZone((string)Support::setting('app.timezone', 'Asia/Manila'));
    }

    private function isReportDay(): bool
    {
        $dow = (int)(new \DateTimeImmutable('now', $this->tz()))->format('w');
        return $dow === (int)Support::setting('treasury.report_day', '6');
    }

    private function weekAnchor(): string
    {
        $target = (int)Support::setting('treasury.report_day', '6');
        $today = new \DateTimeImmutable('now', $this->tz());
        $diff = $target - (int)$today->format('w');
        return $today->modify(($diff >= 0 ? '+' : '') . $diff . ' days')->format('Y-m-d');
    }
}
