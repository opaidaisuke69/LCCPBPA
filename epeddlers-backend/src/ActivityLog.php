<?php
declare(strict_types=1);

namespace ePeddlers;

/**
 * Writes audit entries. Logs are append-only via the API (no update/delete routes).
 */
final class ActivityLog
{
    public static function record(
        ?int $actorId,
        string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        ?array $before = null,
        ?array $after = null
    ): void {
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, before_json, after_json, ip_address)
             VALUES (:actor, :action, :etype, :eid, :before, :after, :ip)'
        );
        $stmt->execute([
            ':actor'  => $actorId,
            ':action' => $action,
            ':etype'  => $entityType,
            ':eid'    => $entityId,
            ':before' => $before !== null ? json_encode($before, JSON_UNESCAPED_UNICODE) : null,
            ':after'  => $after !== null ? json_encode($after, JSON_UNESCAPED_UNICODE) : null,
            ':ip'     => $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    }
}
