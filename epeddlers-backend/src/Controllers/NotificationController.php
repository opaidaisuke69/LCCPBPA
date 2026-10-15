<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

final class NotificationController
{
    public function index(): void
    {
        $user = Auth::requireUser();
        [$page, $per, $offset] = Support::pagination(20, 50);
        $pdo = Database::connect();

        $unreadOnly = Request::query('unread', '0') === '1';
        $where = 'WHERE user_id = :u';
        $params = [':u' => $user['id']];
        if ($unreadOnly) {
            $where .= ' AND is_read = 0';
        }

        $count = $pdo->prepare("SELECT COUNT(*) FROM notifications $where");
        $count->execute($params);
        $total = (int)$count->fetchColumn();

        $unread = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :u AND is_read = 0');
        $unread->execute([':u' => $user['id']]);

        $stmt = $pdo->prepare(
            "SELECT id, type, title, body, application_id, link, is_read, created_at
             FROM notifications $where ORDER BY id DESC LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);

        Response::ok($stmt->fetchAll(), array_merge(
            Support::pageMeta($page, $per, $total),
            ['unread' => (int)$unread->fetchColumn()],
        ));
    }

    public function markRead(array $p): void
    {
        $user = Auth::requireUser();
        $pdo = Database::connect();
        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :u');
        $stmt->execute([':id' => $p['id'], ':u' => $user['id']]);
        Response::ok(['message' => 'Marked read.']);
    }

    public function markAllRead(): void
    {
        $user = Auth::requireUser();
        Database::connect()
            ->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = :u AND is_read = 0')
            ->execute([':u' => $user['id']]);
        Response::ok(['message' => 'All marked read.']);
    }
}
