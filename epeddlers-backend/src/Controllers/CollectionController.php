<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\ActivityLog;
use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

final class CollectionController
{
    /**
     * Record an arkabala/tax collection. Server-authoritative:
     * amount is taken from the active fee schedule, never trusted from the client.
     * Idempotency key prevents accidental double collection.
     */
    public function store(): void
    {
        $actor = Auth::requirePermission('collections.record');
        $v = Request::validate([
            'peddler_id'      => 'required|int',
            'fee_category_id' => 'required|int',
        ]);
        $pdo = Database::connect();

        // Idempotency: header or body key.
        $idem = Request::idempotencyKey() ?? (Request::input('idempotency_key') ? substr((string)Request::input('idempotency_key'), 0, 80) : null);
        if ($idem) {
            $dup = $pdo->prepare('SELECT txn_ref, amount, status, collected_at FROM collection_transactions WHERE idempotency_key = :k');
            $dup->execute([':k' => $idem]);
            if ($existing = $dup->fetch()) {
                // Return the original result rather than creating a duplicate.
                Response::ok([
                    'txn_ref' => $existing['txn_ref'],
                    'amount' => (float)$existing['amount'],
                    'status' => $existing['status'],
                    'collected_at' => $existing['collected_at'],
                    'duplicate' => true,
                    'message' => 'This collection was already recorded.',
                ]);
            }
        }

        // Validate peddler.
        $ped = $pdo->prepare('SELECT id, status FROM peddlers WHERE id = :id');
        $ped->execute([':id' => $v['peddler_id']]);
        $peddler = $ped->fetch();
        if (!$peddler) {
            Response::error(404, 'NOT_FOUND', 'Peddler not found.');
        }
        if ($peddler['status'] !== 'active') {
            Response::error(422, 'INELIGIBLE', 'This peddler is not eligible for collection.');
        }

        // Local business date (La Carlota) for fee effectivity comparison.
        $localDate = (new \DateTimeImmutable('now', new \DateTimeZone((string)Support::setting('app.timezone', 'Asia/Manila'))))->format('Y-m-d');

        // Server-side amount from the active fee schedule for the category.
        $fee = $pdo->prepare(
            "SELECT fc.id AS cat_id, fc.name, fs.id AS sched_id, fs.amount
             FROM fee_categories fc
             JOIN fee_schedules fs ON fs.fee_category_id = fc.id
             WHERE fc.id = :cid AND fc.is_active = 1
               AND fs.effective_from <= :d1
               AND (fs.effective_to IS NULL OR fs.effective_to >= :d2)
             ORDER BY fs.effective_from DESC LIMIT 1"
        );
        $fee->execute([':cid' => $v['fee_category_id'], ':d1' => $localDate, ':d2' => $localDate]);
        $feeRow = $fee->fetch();
        if (!$feeRow) {
            Response::error(422, 'NO_FEE_SCHEDULE', 'No active fee schedule for this category.');
        }
        $amount = (float)$feeRow['amount'];

        // Collection week anchor = the configured report day (Saturday) of the current week.
        $reportDow = (int)Support::setting('treasury.report_day', '6'); // 0..6 (Sat=6)
        $collectionWeek = $this->weekAnchor($reportDow);

        $txnRef = Support::randomCode('TXN', 10);

        try {
            $pdo->beginTransaction();
            $ins = $pdo->prepare(
                'INSERT INTO collection_transactions
                    (txn_ref, peddler_id, application_id, fee_category_id, amount, collected_by,
                     collected_at, collection_week, status, idempotency_key, remarks)
                 VALUES (:ref, :ped, :app, :cat, :amt, :by, UTC_TIMESTAMP(), :week, "success", :idem, :rem)'
            );
            $ins->execute([
                ':ref' => $txnRef, ':ped' => $v['peddler_id'],
                ':app' => Request::input('application_id'),
                ':cat' => $v['fee_category_id'], ':amt' => $amount, ':by' => $actor['id'],
                ':week' => $collectionWeek, ':idem' => $idem,
                ':rem' => Request::input('remarks'),
            ]);
            $id = (int)$pdo->lastInsertId();
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            // Unique idempotency key race -> return the stored result.
            if ($idem) {
                $dup = $pdo->prepare('SELECT txn_ref, amount, status, collected_at FROM collection_transactions WHERE idempotency_key = :k');
                $dup->execute([':k' => $idem]);
                if ($existing = $dup->fetch()) {
                    Response::ok(array_merge($existing, ['duplicate' => true]));
                }
            }
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'collection.record', 'collection', (string)$id, null,
            ['txn_ref' => $txnRef, 'amount' => $amount, 'peddler_id' => $v['peddler_id']]);

        Response::created([
            'txn_ref' => $txnRef,
            'amount' => $amount,
            'fee_name' => $feeRow['name'],
            'status' => 'success',
            'collection_week' => $collectionWeek,
            'message' => 'Collection recorded successfully.',
        ]);
    }

    public function history(): void
    {
        Auth::requirePermission('collections.record');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $peddlerId = (int)Request::query('peddler_id', 0);
        $where = [];
        $params = [];
        if ($peddlerId > 0) {
            $where[] = 'ct.peddler_id = :pid';
            $params[':pid'] = $peddlerId;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $count = $pdo->prepare("SELECT COUNT(*) FROM collection_transactions ct $whereSql");
        $count->execute($params);
        $total = (int)$count->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT ct.id, ct.txn_ref, ct.amount, ct.status, ct.collected_at, ct.collection_week,
                    pe.full_name AS peddler_name, fc.name AS fee_name
             FROM collection_transactions ct
             JOIN peddlers pe ON pe.id = ct.peddler_id
             JOIN fee_categories fc ON fc.id = ct.fee_category_id
             $whereSql ORDER BY ct.id DESC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }

    /** Date of the configured report day (e.g. Saturday) for the current week. */
    private function weekAnchor(int $targetDow): string
    {
        // PHP 'w': 0 (Sun) .. 6 (Sat)
        $today = new \DateTimeImmutable('now', new \DateTimeZone((string)Support::setting('app.timezone', 'Asia/Manila')));
        $currentDow = (int)$today->format('w');
        $diff = $targetDow - $currentDow;
        return $today->modify(($diff >= 0 ? '+' : '') . $diff . ' days')->format('Y-m-d');
    }

    public function feeCategories(): void
    {
        Auth::requirePermission('collections.record');
        $pdo = Database::connect();
        $localDate = (new \DateTimeImmutable('now', new \DateTimeZone((string)Support::setting('app.timezone', 'Asia/Manila'))))->format('Y-m-d');
        $stmt = $pdo->prepare(
            "SELECT fc.id, fc.code, fc.name, fc.kind, fs.amount
             FROM fee_categories fc
             LEFT JOIN fee_schedules fs ON fs.fee_category_id = fc.id
                AND fs.effective_from <= :d1
                AND (fs.effective_to IS NULL OR fs.effective_to >= :d2)
             WHERE fc.is_active = 1 AND fc.kind IN ('arkabala','vending')
             ORDER BY fc.name"
        );
        $stmt->execute([':d1' => $localDate, ':d2' => $localDate]);
        $rows = $stmt->fetchAll();
        Response::ok($rows);
    }
}
