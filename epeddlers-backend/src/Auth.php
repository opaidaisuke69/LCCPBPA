<?php
declare(strict_types=1);

namespace ePeddlers;

use PDO;

/**
 * Token-based authentication and role/permission checks.
 * Tokens are opaque random strings; only their SHA-256 hash is stored.
 */
final class Auth
{
    private static ?array $user = null;

    /** Issue a new token for a user, returns the raw token (shown once). */
    public static function issueToken(int $userId, ?string $deviceLabel = null): string
    {
        $raw = bin2hex(random_bytes(32));
        $hash = hash('sha256', $raw);
        $ttl = Config::int('TOKEN_TTL', 0);
        $expires = $ttl > 0 ? gmdate('Y-m-d H:i:s', time() + $ttl) : null;

        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'INSERT INTO personal_access_tokens (user_id, token_hash, device_label, expires_at)
             VALUES (:uid, :hash, :label, :exp)'
        );
        $stmt->execute([':uid' => $userId, ':hash' => $hash, ':label' => $deviceLabel, ':exp' => $expires]);

        return $raw;
    }

    public static function revokeToken(string $rawToken): void
    {
        $pdo = Database::connect();
        $stmt = $pdo->prepare('DELETE FROM personal_access_tokens WHERE token_hash = :h');
        $stmt->execute([':h' => hash('sha256', $rawToken)]);
    }

    /** Resolve the authenticated user from the bearer token, or null. */
    public static function user(): ?array
    {
        if (self::$user !== null) {
            return self::$user ?: null;
        }

        $raw = Request::bearerToken();
        if (!$raw) {
            self::$user = [];
            return null;
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'SELECT u.*, pat.id AS token_id, pat.expires_at
             FROM personal_access_tokens pat
             JOIN users u ON u.id = pat.user_id
             WHERE pat.token_hash = :h'
        );
        $stmt->execute([':h' => hash('sha256', $raw)]);
        $row = $stmt->fetch();

        if (!$row) {
            self::$user = [];
            return null;
        }
        if ($row['expires_at'] !== null && strtotime($row['expires_at']) < time()) {
            self::$user = [];
            return null;
        }
        if ($row['status'] !== 'active') {
            self::$user = [];
            return null;
        }

        // Attach roles + permissions
        $row['roles'] = self::rolesFor((int)$row['id']);
        $row['permissions'] = self::permissionsFor((int)$row['id']);
        unset($row['password_hash']);

        $pdo->prepare('UPDATE personal_access_tokens SET last_used_at = UTC_TIMESTAMP() WHERE id = :id')
            ->execute([':id' => $row['token_id']]);

        return self::$user = $row;
    }

    public static function requireUser(): array
    {
        $user = self::user();
        if (!$user) {
            Response::error(401, 'UNAUTHENTICATED', 'Authentication required.');
        }
        return $user;
    }

    public static function requirePermission(string $permission): array
    {
        $user = self::requireUser();
        if (!in_array($permission, $user['permissions'], true)) {
            Response::error(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
        }
        return $user;
    }

    public static function hasRole(array $user, string $roleCode): bool
    {
        foreach ($user['roles'] as $r) {
            if ($r['code'] === $roleCode) {
                return true;
            }
        }
        return false;
    }

    public static function rolesFor(int $userId): array
    {
        $stmt = Database::connect()->prepare(
            'SELECT r.code, r.name, r.category FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = :id'
        );
        $stmt->execute([':id' => $userId]);
        return $stmt->fetchAll();
    }

    public static function permissionsFor(int $userId): array
    {
        $stmt = Database::connect()->prepare(
            'SELECT DISTINCT p.code FROM user_roles ur
             JOIN role_permissions rp ON rp.role_id = ur.role_id
             JOIN permissions p ON p.id = rp.permission_id
             WHERE ur.user_id = :id'
        );
        $stmt->execute([':id' => $userId]);
        return array_column($stmt->fetchAll(), 'code');
    }
}
