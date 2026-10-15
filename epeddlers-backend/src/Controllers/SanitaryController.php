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

final class SanitaryController
{
    public function index(): void
    {
        Auth::requirePermission('sanitary.conduct');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $search = trim((string)Request::query('search', ''));
        $where = ["a.status = 'pending_sanitary_review'"];
        $params = [];
        if ($search !== '') {
            $where[] = '(a.application_code LIKE :s1 OR a.applicant_name LIKE :s2)';
            $params[':s1'] = "%$search%";
            $params[':s2'] = "%$search%";
        }
        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $count = $pdo->prepare("SELECT COUNT(*) FROM applications a $whereSql");
        $count->execute($params);
        $total = (int)$count->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT a.id, a.application_code, a.type, a.applicant_name, a.business_name,
                    a.goods_type, a.submitted_at, a.status
             FROM applications a $whereSql ORDER BY a.submitted_at ASC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }

    public function store(): void
    {
        $actor = Auth::requirePermission('sanitary.conduct');
        $v = Request::validate([
            'application_id' => 'required|int',
            'compliance'     => 'in:compliant,non_compliant',
            'decision'       => 'in:approve,reject,return',
        ]);
        $pdo = Database::connect();

        $app = $this->findApp($pdo, (int)$v['application_id']);
        if ($app['status'] !== 'pending_sanitary_review') {
            Response::error(422, 'INVALID_STATE', 'This application is not pending sanitary review.');
        }

        $ins = $pdo->prepare(
            'INSERT INTO sanitary_inspections (application_id, officer_id, inspected_at, compliance, decision, findings, remarks, status)
             VALUES (:app, :off, UTC_TIMESTAMP(), :comp, :dec, :find, :rem, "draft")'
        );
        $ins->execute([
            ':app' => $v['application_id'], ':off' => $actor['id'],
            ':comp' => $v['compliance'] ?? null, ':dec' => $v['decision'] ?? null,
            ':find' => Request::input('findings'), ':rem' => Request::input('remarks'),
        ]);
        $id = (int)$pdo->lastInsertId();
        ActivityLog::record((int)$actor['id'], 'sanitary.create', 'sanitary_inspection', (string)$id);
        Response::created(['id' => $id, 'status' => 'draft']);
    }

    public function submit(array $p): void
    {
        $actor = Auth::requirePermission('sanitary.conduct');
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM sanitary_inspections WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $san = $stmt->fetch();
        if (!$san) {
            Response::error(404, 'NOT_FOUND', 'Sanitary review not found.');
        }
        if ($san['status'] === 'submitted') {
            Response::error(422, 'ALREADY_SUBMITTED', 'This review was already submitted.');
        }
        if (!$san['decision']) {
            Response::error(422, 'VALIDATION_FAILED', 'A decision is required before submitting.');
        }

        $app = $this->findApp($pdo, (int)$san['application_id']);
        if ($app['status'] !== 'pending_sanitary_review') {
            Response::error(409, 'CONFLICT', 'The application is no longer pending sanitary review.');
        }

        try {
            $pdo->beginTransaction();
            $pdo->prepare('UPDATE sanitary_inspections SET status = "submitted", inspected_at = COALESCE(inspected_at, UTC_TIMESTAMP()) WHERE id = :id')
                ->execute([':id' => $p['id']]);

            $dec = $san['decision'];
            if ($dec === 'approve') {
                Workflow::transition($pdo, (int)$app['id'], 'pending_sanitary_review', 'sanitary_approved',
                    (int)$actor['id'], 'sanitary', 'Sanitary review approved.', true);
                Workflow::transition($pdo, (int)$app['id'], 'sanitary_approved', 'awaiting_payment',
                    (int)$actor['id'], 'sanitary', 'Forwarded to treasury for payment.', true);
                \ePeddlers\Notify::toPermission($pdo, 'treasury.verify', 'payment_pending',
                    'Payment pending verification', $app['application_code'] . ' is awaiting payment.',
                    (int)$app['id'], '/treasury/applicants');
            } elseif ($dec === 'reject') {
                Workflow::transition($pdo, (int)$app['id'], 'pending_sanitary_review', 'sanitary_rejected',
                    (int)$actor['id'], 'sanitary', $san['remarks'] ?: 'Sanitary review rejected.', true);
            } else {
                Workflow::transition($pdo, (int)$app['id'], 'pending_sanitary_review', 'incomplete_requires_correction',
                    (int)$actor['id'], 'sanitary', $san['remarks'] ?: 'Returned for correction.', true);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'sanitary.submit', 'sanitary_inspection', (string)$p['id'],
            null, ['decision' => $san['decision']]);
        Response::ok(['message' => 'Sanitary review submitted.', 'decision' => $san['decision']]);
    }

    private function findApp(\PDO $pdo, int $id): array
    {
        $stmt = $pdo->prepare('SELECT * FROM applications WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $app = $stmt->fetch();
        if (!$app) {
            Response::error(404, 'NOT_FOUND', 'Application not found.');
        }
        return $app;
    }
}
