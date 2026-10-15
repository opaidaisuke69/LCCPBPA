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

final class ApplicationController
{
    /** PUBLIC: create a draft application and return Application ID + tracking PIN. */
    public function store(): void
    {
        $v = Request::validate([
            'type'           => 'required|in:new,renewal',
            'applicant_name' => 'required|string|max:150',
            'contact_number' => 'string|max:30',
            'email'          => 'email|max:150',
            'address'        => 'string|max:255',
            'business_name'  => 'string|max:150',
            'goods_type'     => 'string|max:150',
        ]);

        $pdo = Database::connect();
        $peddlerId = null;

        if ($v['type'] === 'renewal') {
            $prevPermit = trim((string)Request::input('previous_permit_code', ''));
            if ($prevPermit !== '') {
                $stmt = $pdo->prepare('SELECT id, peddler_id FROM permits WHERE permit_code = :c');
                $stmt->execute([':c' => $prevPermit]);
                $permit = $stmt->fetch();
                if ($permit) {
                    $peddlerId = (int)$permit['peddler_id'];
                }
            }
        }

        // Generate a unique application code.
        $code = $this->uniqueCode($pdo, 'applications', 'application_code', 'EP');
        $pin = Support::randomPin(6);

        $stmt = $pdo->prepare(
            'INSERT INTO applications
                (application_code, track_pin, type, peddler_id, status,
                 applicant_name, contact_number, email, address, id_type, id_number,
                 business_name, goods_type, activity_description, preferred_location, extra)
             VALUES
                (:code, :pin, :type, :pid, "draft",
                 :name, :contact, :email, :address, :idt, :idn,
                 :bname, :goods, :actdesc, :ploc, :extra)'
        );
        $stmt->execute([
            ':code' => $code, ':pin' => $pin, ':type' => $v['type'], ':pid' => $peddlerId,
            ':name' => $v['applicant_name'], ':contact' => $v['contact_number'] ?? null,
            ':email' => $v['email'] ?? null, ':address' => $v['address'] ?? null,
            ':idt' => Request::input('id_type'), ':idn' => Request::input('id_number'),
            ':bname' => $v['business_name'] ?? null, ':goods' => $v['goods_type'] ?? null,
            ':actdesc' => Request::input('activity_description'),
            ':ploc' => Request::input('preferred_location'),
            ':extra' => ($x = Request::input('extra')) ? json_encode($x) : null,
        ]);
        $id = (int)$pdo->lastInsertId();

        ActivityLog::record(null, 'application.create', 'application', (string)$id, null, ['code' => $code]);

        Response::created([
            'id' => $id,
            'application_code' => $code,
            'track_pin' => $pin,
            'status' => 'draft',
            'message' => 'Application created as draft. Submit it to begin processing. Keep your Application ID and PIN to track status.',
        ]);
    }

    /** PUBLIC: submit a draft (idempotency-safe). */
    public function submit(array $p): void
    {
        $pdo = Database::connect();
        $app = $this->findByCode($pdo, (string)$p['code']);
        $this->assertPin($app);

        if ($app['status'] === 'submitted' || $app['status'] === 'under_initial_review') {
            Response::ok(['application_code' => $app['application_code'], 'status' => $app['status'],
                'message' => 'Already submitted.']);
        }
        if ($app['status'] !== 'draft' && $app['status'] !== 'incomplete_requires_correction') {
            Response::error(422, 'INVALID_STATE', 'This application cannot be submitted in its current state.');
        }

        $from = $app['status'];
        $pdo->prepare('UPDATE applications SET submitted_at = COALESCE(submitted_at, UTC_TIMESTAMP()) WHERE id = :id')
            ->execute([':id' => $app['id']]);
        Workflow::transition($pdo, (int)$app['id'], $from, 'submitted', null, 'applicant',
            'Application submitted by applicant.', true);

        \ePeddlers\Notify::toPermission($pdo, 'applications.review', 'application_submitted',
            'New application submitted', $app['application_code'] . ' is awaiting initial review.',
            (int)$app['id'], '/admin/applications');

        Response::ok([
            'application_code' => $app['application_code'],
            'status' => 'submitted',
            'message' => 'Application submitted successfully.',
        ]);
    }

    /** PUBLIC: track an application using code + PIN. Returns applicant-safe data only. */
    public function track(): void
    {
        $code = trim((string)Request::query('code', ''));
        $pin  = trim((string)Request::query('pin', ''));
        if ($code === '' || $pin === '') {
            Response::error(422, 'VALIDATION_FAILED', 'Application ID and PIN are required.');
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'SELECT id, application_code, track_pin, type, status, submitted_at, created_at
             FROM applications WHERE application_code = :c'
        );
        $stmt->execute([':c' => $code]);
        $app = $stmt->fetch();

        // Uniform error to avoid revealing which part was wrong.
        if (!$app || !hash_equals((string)$app['track_pin'], $pin)) {
            Response::error(404, 'NOT_FOUND', 'No matching application found. Check your Application ID and PIN.');
        }

        $tl = $pdo->prepare(
            'SELECT to_status, department, remarks, created_at
             FROM application_status_history
             WHERE application_id = :id AND public_visible = 1
             ORDER BY created_at ASC'
        );
        $tl->execute([':id' => $app['id']]);

        Response::ok([
            'application_code' => $app['application_code'],
            'type' => $app['type'],
            'status' => $app['status'],
            'submitted_at' => $app['submitted_at'],
            'created_at' => $app['created_at'],
            'timeline' => $tl->fetchAll(),
        ]);
    }

    /** AUTH: list applications with search/filter/pagination. */
    public function index(): void
    {
        Auth::requirePermission('applications.view');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $search = trim((string)Request::query('search', ''));
        $status = trim((string)Request::query('status', ''));
        $type   = trim((string)Request::query('type', ''));

        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = '(application_code LIKE :s1 OR applicant_name LIKE :s2)';
            $params[':s1'] = '%' . $search . '%';
            $params[':s2'] = '%' . $search . '%';
        }
        if (in_array($status, Workflow::STATUSES, true)) {
            $where[] = 'status = :st';
            $params[':st'] = $status;
        }
        if (in_array($type, ['new', 'renewal'], true)) {
            $where[] = 'type = :ty';
            $params[':ty'] = $type;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM applications $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT id, application_code, type, status, applicant_name, business_name,
                    goods_type, submitted_at, created_at
             FROM applications $whereSql
             ORDER BY created_at DESC
             LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);

        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }

    /** AUTH: full application detail. */
    public function show(array $p): void
    {
        Auth::requirePermission('applications.view');
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM applications WHERE id = :id OR application_code = :id2');
        $stmt->execute([':id' => is_numeric($p['id']) ? $p['id'] : 0, ':id2' => $p['id']]);
        $app = $stmt->fetch();
        if (!$app) {
            Response::error(404, 'NOT_FOUND', 'Application not found.');
        }
        unset($app['track_pin']); // never expose PIN through the authenticated API

        $docs = $pdo->prepare('SELECT id, doc_type, original_name, mime_type, size_bytes, uploaded_at
                               FROM application_documents WHERE application_id = :id');
        $docs->execute([':id' => $app['id']]);
        $app['documents'] = $docs->fetchAll();

        Response::ok($app);
    }

    /** AUTH: full timeline (internal view). */
    public function timeline(array $p): void
    {
        Auth::requirePermission('applications.view');
        $pdo = Database::connect();
        $appId = $this->resolveId($pdo, (string)$p['id']);
        $stmt = $pdo->prepare(
            'SELECT h.from_status, h.to_status, h.department, h.remarks, h.public_visible,
                    h.created_at, u.full_name AS changed_by_name
             FROM application_status_history h
             LEFT JOIN users u ON u.id = h.changed_by
             WHERE h.application_id = :id ORDER BY h.created_at ASC'
        );
        $stmt->execute([':id' => $appId]);
        Response::ok($stmt->fetchAll());
    }

    public function review(array $p): void
    {
        $actor = Auth::requirePermission('applications.review');
        $pdo = Database::connect();
        $app = $this->findById($pdo, $this->resolveId($pdo, (string)$p['id']));

        if ($app['status'] !== 'submitted') {
            Response::error(422, 'INVALID_STATE', 'Only submitted applications can be moved to initial review.');
        }
        Workflow::transition($pdo, (int)$app['id'], 'submitted', 'under_initial_review',
            (int)$actor['id'], 'admin', Request::input('remarks'), true);
        // Advance to pending inspection as part of accepting the review.
        Workflow::transition($pdo, (int)$app['id'], 'under_initial_review', 'pending_inspection',
            (int)$actor['id'], 'admin', 'Forwarded for inspection.', true);

        \ePeddlers\Notify::toPermission($pdo, 'inspections.conduct', 'inspection_assigned',
            'Inspection pending', $app['application_code'] . ' is ready for inspection.',
            (int)$app['id'], '/(app)/queue');

        Response::ok(['status' => 'pending_inspection', 'message' => 'Application accepted and forwarded for inspection.']);
    }

    public function returnForCorrection(array $p): void
    {
        $actor = Auth::requirePermission('applications.review');
        $v = Request::validate(['reason' => 'required|string|max:500']);
        $pdo = Database::connect();
        $app = $this->findById($pdo, $this->resolveId($pdo, (string)$p['id']));

        Workflow::transition($pdo, (int)$app['id'], $app['status'], 'incomplete_requires_correction',
            (int)$actor['id'], 'admin', $v['reason'], true);
        Response::ok(['status' => 'incomplete_requires_correction', 'message' => 'Returned to applicant for correction.']);
    }

    public function approve(array $p): void
    {
        $actor = Auth::requirePermission('applications.approve');
        $pdo = Database::connect();
        $app = $this->findById($pdo, $this->resolveId($pdo, (string)$p['id']));

        if ($app['status'] !== 'ready_for_final_approval') {
            Response::error(422, 'INVALID_STATE',
                'Final approval requires the application to be ready (all prior stages complete).');
        }

        try {
            $pdo->beginTransaction();
            Workflow::transition($pdo, (int)$app['id'], 'ready_for_final_approval', 'approved',
                (int)$actor['id'], 'admin', Request::input('remarks'), true);
            $permit = $this->issuePermit($pdo, $app, (int)$actor['id']);
            Workflow::transition($pdo, (int)$app['id'], 'approved', 'permit_issued',
                (int)$actor['id'], 'admin', 'Permit issued: ' . $permit['permit_code'], true);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Response::ok(['status' => 'permit_issued', 'permit' => $permit, 'message' => 'Permit approved and issued.']);
    }

    public function reject(array $p): void
    {
        $actor = Auth::requirePermission('applications.reject');
        $v = Request::validate(['reason' => 'required|string|max:500']);
        $pdo = Database::connect();
        $app = $this->findById($pdo, $this->resolveId($pdo, (string)$p['id']));

        if (!Workflow::canTransition($app['status'], 'rejected')) {
            Response::error(422, 'INVALID_STATE', 'This application cannot be rejected from its current status.');
        }
        Workflow::transition($pdo, (int)$app['id'], $app['status'], 'rejected',
            (int)$actor['id'], 'admin', $v['reason'], true);
        Response::ok(['status' => 'rejected', 'message' => 'Application rejected.']);
    }

    // ---- helpers ----------------------------------------------------------

    private function issuePermit(\PDO $pdo, array $app, int $actorId): array
    {
        // Ensure a peddler record exists (create from application snapshot if needed).
        $peddlerId = $app['peddler_id'] ? (int)$app['peddler_id'] : null;
        if (!$peddlerId) {
            $pcode = $this->uniqueCode($pdo, 'peddlers', 'peddler_code', 'PD');
            $ins = $pdo->prepare(
                'INSERT INTO peddlers (peddler_code, full_name, contact_number, email, address, id_type, id_number)
                 VALUES (:c, :n, :ct, :e, :a, :it, :in)'
            );
            $ins->execute([
                ':c' => $pcode, ':n' => $app['applicant_name'], ':ct' => $app['contact_number'],
                ':e' => $app['email'], ':a' => $app['address'],
                ':it' => $app['id_type'], ':in' => $app['id_number'],
            ]);
            $peddlerId = (int)$pdo->lastInsertId();
            $pdo->prepare('UPDATE applications SET peddler_id = :pid WHERE id = :id')
                ->execute([':pid' => $peddlerId, ':id' => $app['id']]);
        }

        $validityDays = (int)Support::setting('permit.validity_days', '365');
        $prefix = Support::setting('permit.code_prefix', 'EP');
        $permitCode = $this->uniqueCode($pdo, 'permits', 'permit_code', $prefix . 'P');
        $qrRef = hash('sha256', random_bytes(32));

        $ins = $pdo->prepare(
            'INSERT INTO permits (permit_code, qr_reference, application_id, peddler_id, status, valid_from, valid_to, issued_by)
             VALUES (:c, :qr, :app, :ped, "issued", CURDATE(), DATE_ADD(CURDATE(), INTERVAL :days DAY), :by)'
        );
        $ins->execute([
            ':c' => $permitCode, ':qr' => $qrRef, ':app' => $app['id'], ':ped' => $peddlerId,
            ':days' => $validityDays, ':by' => $actorId,
        ]);
        $permitId = (int)$pdo->lastInsertId();

        ActivityLog::record($actorId, 'permit.issue', 'permit', (string)$permitId, null,
            ['permit_code' => $permitCode, 'peddler_id' => $peddlerId]);

        return ['id' => $permitId, 'permit_code' => $permitCode, 'peddler_id' => $peddlerId];
    }

    private function uniqueCode(\PDO $pdo, string $table, string $col, string $prefix): string
    {
        for ($i = 0; $i < 10; $i++) {
            $code = Support::randomCode($prefix, 8);
            $stmt = $pdo->prepare("SELECT 1 FROM $table WHERE $col = :c LIMIT 1");
            $stmt->execute([':c' => $code]);
            if (!$stmt->fetch()) {
                return $code;
            }
        }
        Response::error(500, 'CODE_GENERATION_FAILED', 'Could not generate a unique code.');
    }

    private function findByCode(\PDO $pdo, string $code): array
    {
        $stmt = $pdo->prepare('SELECT * FROM applications WHERE application_code = :c');
        $stmt->execute([':c' => $code]);
        $app = $stmt->fetch();
        if (!$app) {
            Response::error(404, 'NOT_FOUND', 'Application not found.');
        }
        return $app;
    }

    private function findById(\PDO $pdo, int $id): array
    {
        $stmt = $pdo->prepare('SELECT * FROM applications WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $app = $stmt->fetch();
        if (!$app) {
            Response::error(404, 'NOT_FOUND', 'Application not found.');
        }
        return $app;
    }

    private function resolveId(\PDO $pdo, string $idOrCode): int
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

    private function assertPin(array $app): void
    {
        $pin = trim((string)Request::input('track_pin', Request::query('pin', '')));
        if (!hash_equals((string)$app['track_pin'], $pin)) {
            Response::error(403, 'INVALID_PIN', 'Invalid tracking PIN for this application.');
        }
    }
}
