<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

final class PeddlerController
{
    public function index(): void
    {
        Auth::requirePermission('applications.view');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $search = trim((string)Request::query('search', ''));
        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = '(full_name LIKE :s1 OR peddler_code LIKE :s2 OR contact_number LIKE :s3)';
            $params[':s1'] = "%$search%";
            $params[':s2'] = "%$search%";
            $params[':s3'] = "%$search%";
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $count = $pdo->prepare("SELECT COUNT(*) FROM peddlers $whereSql");
        $count->execute($params);
        $total = (int)$count->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT id, peddler_code, full_name, contact_number, email, status, created_at
             FROM peddlers $whereSql ORDER BY full_name ASC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }

    public function show(array $p): void
    {
        Auth::requirePermission('applications.view');
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM peddlers WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $peddler = $stmt->fetch();
        if (!$peddler) {
            Response::error(404, 'NOT_FOUND', 'Peddler not found.');
        }
        Response::ok($peddler);
    }

    public function permits(array $p): void
    {
        Auth::requirePermission('applications.view');
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'SELECT id, permit_code, status, valid_from, valid_to, issued_at
             FROM permits WHERE peddler_id = :id ORDER BY issued_at DESC'
        );
        $stmt->execute([':id' => $p['id']]);
        Response::ok($stmt->fetchAll());
    }

    public function violations(array $p): void
    {
        Auth::requirePermission('violations.view');
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'SELECT v.*, vc.name AS category_name FROM violations v
             JOIN violation_categories vc ON vc.id = v.category_id
             WHERE v.peddler_id = :id ORDER BY v.id DESC'
        );
        $stmt->execute([':id' => $p['id']]);
        Response::ok($stmt->fetchAll());
    }
}
