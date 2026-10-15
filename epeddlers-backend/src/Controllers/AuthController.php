<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\ActivityLog;
use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;

final class AuthController
{
    public function login(): void
    {
        $v = Request::validate([
            'username' => 'required|string|max:100',
            'password' => 'required|string|max:200',
        ]);

        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :u OR email = :e LIMIT 1');
        $stmt->execute([':u' => $v['username'], ':e' => $v['username']]);
        $user = $stmt->fetch();

        // Constant-ish response: always run verify to reduce timing signal.
        $hash = $user['password_hash'] ?? '$2y$10$usesomethingrandomhereforcomparison0000000000000000000';
        $valid = password_verify($v['password'], $hash);

        if (!$user || !$valid) {
            Response::error(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
        }
        if ($user['status'] !== 'active') {
            Response::error(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
        }

        $token = Auth::issueToken((int)$user['id'], Request::input('device_label'));

        $pdo->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = :id')
            ->execute([':id' => $user['id']]);
        ActivityLog::record((int)$user['id'], 'auth.login', 'user', (string)$user['id']);

        Response::ok([
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'must_change_pw' => (bool)$user['must_change_pw'],
                'roles' => Auth::rolesFor((int)$user['id']),
                'permissions' => Auth::permissionsFor((int)$user['id']),
            ],
        ]);
    }

    public function me(): void
    {
        $user = Auth::requireUser();
        Response::ok([
            'id' => (int)$user['id'],
            'full_name' => $user['full_name'],
            'username' => $user['username'],
            'email' => $user['email'],
            'must_change_pw' => (bool)$user['must_change_pw'],
            'last_login_at' => $user['last_login_at'],
            'roles' => $user['roles'],
            'permissions' => $user['permissions'],
        ]);
    }

    public function logout(): void
    {
        $user = Auth::requireUser();
        $raw = Request::bearerToken();
        if ($raw) {
            Auth::revokeToken($raw);
        }
        ActivityLog::record((int)$user['id'], 'auth.logout', 'user', (string)$user['id']);
        Response::ok(['message' => 'Logged out.']);
    }

    public function changePassword(): void
    {
        $user = Auth::requireUser();
        $v = Request::validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|max:200',
        ]);

        if (mb_strlen($v['new_password']) < 8) {
            Response::error(422, 'WEAK_PASSWORD', 'New password must be at least 8 characters.');
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
        $stmt->execute([':id' => $user['id']]);
        $hash = $stmt->fetchColumn();

        if (!password_verify($v['current_password'], (string)$hash)) {
            Response::error(422, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
        }

        $newHash = password_hash($v['new_password'], PASSWORD_BCRYPT);
        $pdo->prepare('UPDATE users SET password_hash = :h, must_change_pw = 0 WHERE id = :id')
            ->execute([':h' => $newHash, ':id' => $user['id']]);

        ActivityLog::record((int)$user['id'], 'auth.change_password', 'user', (string)$user['id']);
        Response::ok(['message' => 'Password updated.']);
    }
}
