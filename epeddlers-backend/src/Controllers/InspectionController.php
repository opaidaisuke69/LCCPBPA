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

final class InspectionController
{
    /** List applications eligible for inspection, or inspection records. */
    public function index(): void
    {
        Auth::requirePermission('inspections.conduct');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $search = trim((string)Request::query('search', ''));
        $where = ["a.status = 'pending_inspection'"];
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

    public function show(array $p): void
    {
        Auth::requirePermission('inspections.conduct');
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'SELECT i.*, u.full_name AS officer_name FROM inspections i
             LEFT JOIN users u ON u.id = i.officer_id WHERE i.id = :id'
        );
        $stmt->execute([':id' => $p['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error(404, 'NOT_FOUND', 'Inspection not found.');
        }
        Response::ok($row);
    }

    /** Create (or draft) an inspection for an application. */
    public function store(): void
    {
        $actor = Auth::requirePermission('inspections.conduct');
        $v = Request::validate([
            'application_id' => 'required|int',
            'compliance'     => 'in:compliant,non_compliant',
            'recommendation' => 'in:approve,reject,return',
        ]);
        $pdo = Database::connect();

        $app = $this->findApp($pdo, (int)$v['application_id']);
        if ($app['status'] !== 'pending_inspection') {
            Response::error(422, 'INVALID_STATE', 'This application is not pending inspection.');
        }

        $ins = $pdo->prepare(
            'INSERT INTO inspections (application_id, officer_id, inspected_at, compliance, recommendation, findings, remarks, status)
             VALUES (:app, :off, UTC_TIMESTAMP(), :comp, :rec, :find, :rem, "draft")'
        );
        $ins->execute([
            ':app' => $v['application_id'], ':off' => $actor['id'],
            ':comp' => $v['compliance'] ?? null, ':rec' => $v['recommendation'] ?? null,
            ':find' => Request::input('findings'), ':rem' => Request::input('remarks'),
        ]);
        $id = (int)$pdo->lastInsertId();
        ActivityLog::record((int)$actor['id'], 'inspection.create', 'inspection', (string)$id);
        Response::created(['id' => $id, 'status' => 'draft']);
    }

    /** Submit an inspection; advances the application workflow by recommendation. */
    public function submit(array $p): void
    {
        $actor = Auth::requirePermission('inspections.conduct');
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM inspections WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $insp = $stmt->fetch();
        if (!$insp) {
            Response::error(404, 'NOT_FOUND', 'Inspection not found.');
        }
        if ($insp['status'] === 'submitted') {
            Response::error(422, 'ALREADY_SUBMITTED', 'This inspection was already submitted.');
        }
        if (!$insp['recommendation']) {
            Response::error(422, 'VALIDATION_FAILED', 'A recommendation is required before submitting.');
        }

        $app = $this->findApp($pdo, (int)$insp['application_id']);
        if ($app['status'] !== 'pending_inspection') {
            Response::error(409, 'CONFLICT', 'The application is no longer pending inspection.');
        }

        try {
            $pdo->beginTransaction();
            $pdo->prepare('UPDATE inspections SET status = "submitted", inspected_at = COALESCE(inspected_at, UTC_TIMESTAMP()) WHERE id = :id')
                ->execute([':id' => $p['id']]);

            $rec = $insp['recommendation'];
            if ($rec === 'approve') {
                Workflow::transition($pdo, (int)$app['id'], 'pending_inspection', 'inspection_approved',
                    (int)$actor['id'], 'inspection', 'Inspection approved.', true);
                Workflow::transition($pdo, (int)$app['id'], 'inspection_approved', 'pending_sanitary_review',
                    (int)$actor['id'], 'inspection', 'Forwarded for sanitary review.', true);
                \ePeddlers\Notify::toPermission($pdo, 'sanitary.conduct', 'sanitary_assigned',
                    'Sanitary review pending', $app['application_code'] . ' is ready for sanitary review.',
                    (int)$app['id'], '/(app)/queue');
            } elseif ($rec === 'reject') {
                Workflow::transition($pdo, (int)$app['id'], 'pending_inspection', 'inspection_rejected',
                    (int)$actor['id'], 'inspection', $insp['remarks'] ?: 'Inspection rejected.', true);
            } else { // return
                Workflow::transition($pdo, (int)$app['id'], 'pending_inspection', 'incomplete_requires_correction',
                    (int)$actor['id'], 'inspection', $insp['remarks'] ?: 'Returned for correction.', true);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'inspection.submit', 'inspection', (string)$p['id'],
            null, ['recommendation' => $insp['recommendation']]);
        Response::ok(['message' => 'Inspection submitted.', 'recommendation' => $insp['recommendation']]);
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
