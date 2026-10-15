<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\ActivityLog;
use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

final class ViolationController
{
    public function index(): void
    {
        Auth::requirePermission('violations.view');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $peddlerId = (int)Request::query('peddler_id', 0);
        $status = trim((string)Request::query('resolution_status', ''));

        $where = [];
        $params = [];
        if ($peddlerId > 0) {
            $where[] = 'v.peddler_id = :pid';
            $params[':pid'] = $peddlerId;
        }
        if (in_array($status, ['open', 'resolved', 'dismissed'], true)) {
            $where[] = 'v.resolution_status = :st';
            $params[':st'] = $status;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $count = $pdo->prepare("SELECT COUNT(*) FROM violations v $whereSql");
        $count->execute($params);
        $total = (int)$count->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT v.*, vc.name AS category_name, pe.full_name AS peddler_name, u.full_name AS recorder
             FROM violations v
             JOIN violation_categories vc ON vc.id = v.category_id
             LEFT JOIN peddlers pe ON pe.id = v.peddler_id
             LEFT JOIN users u ON u.id = v.recorded_by
             $whereSql ORDER BY v.id DESC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }

    public function categories(): void
    {
        Auth::requirePermission('violations.view');
        $rows = Database::connect()
            ->query('SELECT id, code, name, description FROM violation_categories WHERE is_active = 1 ORDER BY name')
            ->fetchAll();
        Response::ok($rows);
    }

    public function show(array $p): void
    {
        Auth::requirePermission('violations.view');
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'SELECT v.*, vc.name AS category_name FROM violations v
             JOIN violation_categories vc ON vc.id = v.category_id WHERE v.id = :id'
        );
        $stmt->execute([':id' => $p['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error(404, 'NOT_FOUND', 'Violation not found.');
        }
        $sanc = $pdo->prepare('SELECT * FROM sanctions WHERE violation_id = :id');
        $sanc->execute([':id' => $p['id']]);
        $row['sanctions'] = $sanc->fetchAll();
        Response::ok($row);
    }

    public function store(): void
    {
        $actor = Auth::requirePermission('violations.record');
        $v = Request::validate([
            'category_id'    => 'required|int',
            'violation_date' => 'required|string|max:10',
            'peddler_id'     => 'int',
            'permit_id'      => 'int',
        ]);
        $pdo = Database::connect();

        // Validate category exists.
        $cat = $pdo->prepare('SELECT id FROM violation_categories WHERE id = :id');
        $cat->execute([':id' => $v['category_id']]);
        if (!$cat->fetch()) {
            Response::error(422, 'INVALID_CATEGORY', 'Unknown violation category.');
        }

        $penalty = Request::input('penalty_amount');
        $penalty = ($penalty === null || $penalty === '') ? null : (float)$penalty;

        try {
            $pdo->beginTransaction();
            $ins = $pdo->prepare(
                'INSERT INTO violations (peddler_id, permit_id, category_id, violation_date, description, recorded_by, penalty_amount, payment_status)
                 VALUES (:ped, :per, :cat, :vd, :desc, :by, :pen, :ps)'
            );
            $ins->execute([
                ':ped' => $v['peddler_id'] ?? null, ':per' => $v['permit_id'] ?? null,
                ':cat' => $v['category_id'], ':vd' => $v['violation_date'],
                ':desc' => Request::input('description'), ':by' => $actor['id'],
                ':pen' => $penalty,
                ':ps' => $penalty !== null ? 'unpaid' : 'not_applicable',
            ]);
            $id = (int)$pdo->lastInsertId();

            $pdo->prepare('INSERT INTO violation_history (violation_id, action, detail, actor_id) VALUES (:v, "created", :d, :a)')
                ->execute([':v' => $id, ':d' => 'Violation recorded.', ':a' => $actor['id']]);

            // Optional sanction.
            $sanctionType = Request::input('sanction_type');
            if ($sanctionType) {
                $pdo->prepare('INSERT INTO sanctions (violation_id, sanction_type, description, applied_by) VALUES (:v, :t, :d, :a)')
                    ->execute([':v' => $id, ':t' => $sanctionType, ':d' => Request::input('sanction_description'), ':a' => $actor['id']]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'violation.create', 'violation', (string)$id, null,
            ['category_id' => $v['category_id'], 'penalty' => $penalty]);
        Response::created(['id' => $id, 'message' => 'Violation recorded.']);
    }

    public function update(array $p): void
    {
        $actor = Auth::requirePermission('violations.record');
        $v = Request::validate(['resolution_status' => 'in:open,resolved,dismissed']);
        $pdo = Database::connect();

        $stmt = $pdo->prepare('SELECT * FROM violations WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $existing = $stmt->fetch();
        if (!$existing) {
            Response::error(404, 'NOT_FOUND', 'Violation not found.');
        }

        $newStatus = $v['resolution_status'] ?? $existing['resolution_status'];
        $pdo->prepare('UPDATE violations SET resolution_status = :s WHERE id = :id')
            ->execute([':s' => $newStatus, ':id' => $p['id']]);
        $pdo->prepare('INSERT INTO violation_history (violation_id, action, detail, actor_id) VALUES (:v, "updated", :d, :a)')
            ->execute([':v' => $p['id'], ':d' => "Status: {$existing['resolution_status']} -> $newStatus", ':a' => $actor['id']]);

        ActivityLog::record((int)$actor['id'], 'violation.update', 'violation', (string)$p['id'],
            ['resolution_status' => $existing['resolution_status']], ['resolution_status' => $newStatus]);
        Response::ok(['message' => 'Violation updated.']);
    }
}
