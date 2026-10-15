<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

final class ActivityLogController
{
    public function index(): void
    {
        Auth::requirePermission('activity.view');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $action = trim((string)Request::query('action', ''));
        $from = trim((string)Request::query('from', ''));
        $to = trim((string)Request::query('to', ''));

        $where = [];
        $params = [];
        if ($action !== '') {
            $where[] = 'a.action LIKE :act';
            $params[':act'] = '%' . $action . '%';
        }
        if ($from !== '') {
            $where[] = 'a.created_at >= :from';
            $params[':from'] = $from . ' 00:00:00';
        }
        if ($to !== '') {
            $where[] = 'a.created_at <= :to';
            $params[':to'] = $to . ' 23:59:59';
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM activity_logs a $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT a.id, a.action, a.entity_type, a.entity_id, a.before_json, a.after_json,
                    a.ip_address, a.created_at, u.full_name AS actor
             FROM activity_logs a LEFT JOIN users u ON u.id = a.actor_id
             $whereSql ORDER BY a.id DESC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);

        Response::ok($stmt->fetchAll(), Support::pageMeta($page, $per, $total));
    }
}
