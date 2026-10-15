<?php
declare(strict_types=1);

namespace ePeddlers;

use PDO;

/**
 * In-app notifications. Optionally fan-out to all users holding a permission.
 */
final class Notify
{
    public static function toUser(
        int $userId,
        string $type,
        string $title,
        ?string $body = null,
        ?int $applicationId = null,
        ?string $link = null
    ): void {
        $stmt = Database::connect()->prepare(
            'INSERT INTO notifications (user_id, type, title, body, application_id, link)
             VALUES (:u, :t, :title, :body, :app, :link)'
        );
        $stmt->execute([
            ':u' => $userId, ':t' => $type, ':title' => $title,
            ':body' => $body, ':app' => $applicationId, ':link' => $link,
        ]);
    }

    /** Notify every active user who has the given permission. */
    public static function toPermission(
        PDO $pdo,
        string $permission,
        string $type,
        string $title,
        ?string $body = null,
        ?int $applicationId = null,
        ?string $link = null
    ): void {
        $stmt = $pdo->prepare(
            'SELECT DISTINCT u.id FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN role_permissions rp ON rp.role_id = ur.role_id
             JOIN permissions p ON p.id = rp.permission_id
             WHERE p.code = :perm AND u.status = "active"'
        );
        $stmt->execute([':perm' => $permission]);
        $ids = array_column($stmt->fetchAll(), 'id');
        foreach ($ids as $id) {
            self::toUser((int)$id, $type, $title, $body, $applicationId, $link);
        }
    }
}
