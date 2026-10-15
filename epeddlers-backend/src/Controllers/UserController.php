<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\ActivityLog;
use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

final class UserController
{
    public function index(): void
    {
        Auth::requirePermission('users.view');
        [$page, $per, $offset] = Support::pagination();
        $pdo = Database::connect();

        $search = trim((string)Request::query('search', ''));
        $status = trim((string)Request::query('status', ''));

        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = '(u.full_name LIKE :s1 OR u.username LIKE :s2 OR u.email LIKE :s3)';
            $params[':s1'] = '%' . $search . '%';
            $params[':s2'] = '%' . $search . '%';
            $params[':s3'] = '%' . $search . '%';
        }
        if (in_array($status, ['active', 'inactive', 'suspended'], true)) {
            $where[] = 'u.status = :st';
            $params[':st'] = $status;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users u $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT u.id, u.full_name, u.username, u.email, u.phone, u.status,
                    u.last_login_at, u.must_change_pw, u.created_at
             FROM users u $whereSql
             ORDER BY u.full_name ASC
             LIMIT $per OFFSET $offset"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['roles'] = Auth::rolesFor((int)$r['id']);
        }
        unset($r);

        Response::ok($rows, Support::pageMeta($page, $per, $total));
    }

    public function show(array $p): void
    {
        Auth::requirePermission('users.view');
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'SELECT id, full_name, username, email, phone, status, last_login_at, must_change_pw, created_at
             FROM users WHERE id = :id'
        );
        $stmt->execute([':id' => $p['id']]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error(404, 'NOT_FOUND', 'User not found.');
        }
        $user['roles'] = Auth::rolesFor((int)$user['id']);
        Response::ok($user);
    }

    public function store(): void
    {
        $actor = Auth::requirePermission('users.manage');
        $v = Request::validate([
            'full_name' => 'required|string|max:150',
            'username'  => 'required|string|max:100',
            'email'     => 'required|email|max:150',
            'phone'     => 'string|max:30',
            'roles'     => 'required',
        ]);
        $roles = Request::input('roles');
        if (!is_array($roles) || !$roles) {
            Response::error(422, 'VALIDATION_FAILED', 'At least one role is required.', ['roles' => 'Required.']);
        }

        $pdo = Database::connect();
        // uniqueness
        $dup = $pdo->prepare('SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1');
        $dup->execute([':u' => $v['username'], ':e' => $v['email']]);
        if ($dup->fetch()) {
            Response::error(409, 'DUPLICATE', 'Username or email already exists.');
        }

        $tempPassword = Support::randomCode('Tmp', 8);
        $hash = password_hash($tempPassword, PASSWORD_BCRYPT);

        try {
            $pdo->beginTransaction();
            $ins = $pdo->prepare(
                'INSERT INTO users (full_name, email, username, password_hash, phone, status, must_change_pw, created_by)
                 VALUES (:n, :e, :u, :h, :p, :st, 1, :cb)'
            );
            $ins->execute([
                ':n' => $v['full_name'], ':e' => $v['email'], ':u' => $v['username'],
                ':h' => $hash, ':p' => $v['phone'] ?? null,
                ':st' => Request::input('status', 'active'), ':cb' => $actor['id'],
            ]);
            $userId = (int)$pdo->lastInsertId();
            $this->syncRoles($pdo, $userId, $roles);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'users.create', 'user', (string)$userId, null, [
            'username' => $v['username'], 'email' => $v['email'], 'roles' => $roles,
        ]);

        Response::created([
            'id' => $userId,
            'temp_password' => $tempPassword, // shown once; user must change on first login
            'message' => 'User created. Share the temporary password securely; it must be changed on first login.',
        ]);
    }

    public function update(array $p): void
    {
        $actor = Auth::requirePermission('users.manage');
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $existing = $stmt->fetch();
        if (!$existing) {
            Response::error(404, 'NOT_FOUND', 'User not found.');
        }

        $v = Request::validate([
            'full_name' => 'string|max:150',
            'email'     => 'email|max:150',
            'phone'     => 'string|max:30',
        ]);

        $fullName = $v['full_name'] ?? $existing['full_name'];
        $email    = $v['email'] ?? $existing['email'];
        $phone    = $v['phone'] ?? $existing['phone'];

        if ($email !== $existing['email']) {
            $dup = $pdo->prepare('SELECT id FROM users WHERE email = :e AND id <> :id LIMIT 1');
            $dup->execute([':e' => $email, ':id' => $p['id']]);
            if ($dup->fetch()) {
                Response::error(409, 'DUPLICATE', 'Email already in use.');
            }
        }

        try {
            $pdo->beginTransaction();
            $upd = $pdo->prepare('UPDATE users SET full_name = :n, email = :e, phone = :p WHERE id = :id');
            $upd->execute([':n' => $fullName, ':e' => $email, ':p' => $phone, ':id' => $p['id']]);

            $roles = Request::input('roles');
            if (is_array($roles) && $roles) {
                $this->syncRoles($pdo, (int)$p['id'], $roles);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        ActivityLog::record((int)$actor['id'], 'users.update', 'user', (string)$p['id'],
            ['full_name' => $existing['full_name'], 'email' => $existing['email']],
            ['full_name' => $fullName, 'email' => $email]);

        Response::ok(['message' => 'User updated.']);
    }

    public function setStatus(array $p): void
    {
        $actor = Auth::requirePermission('users.manage');
        $v = Request::validate(['status' => 'required|in:active,inactive,suspended']);

        if ((int)$p['id'] === (int)$actor['id']) {
            Response::error(422, 'INVALID_OPERATION', 'You cannot change your own account status.');
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT status FROM users WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $before = $stmt->fetchColumn();
        if ($before === false) {
            Response::error(404, 'NOT_FOUND', 'User not found.');
        }

        $pdo->prepare('UPDATE users SET status = :s WHERE id = :id')
            ->execute([':s' => $v['status'], ':id' => $p['id']]);

        // Deactivating revokes active tokens.
        if ($v['status'] !== 'active') {
            $pdo->prepare('DELETE FROM personal_access_tokens WHERE user_id = :id')
                ->execute([':id' => $p['id']]);
        }

        ActivityLog::record((int)$actor['id'], 'users.set_status', 'user', (string)$p['id'],
            ['status' => $before], ['status' => $v['status']]);

        Response::ok(['message' => 'Status updated.']);
    }

    public function resetPassword(array $p): void
    {
        $actor = Auth::requirePermission('users.manage');
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        if (!$stmt->fetch()) {
            Response::error(404, 'NOT_FOUND', 'User not found.');
        }

        $tempPassword = Support::randomCode('Tmp', 8);
        $hash = password_hash($tempPassword, PASSWORD_BCRYPT);
        $pdo->prepare('UPDATE users SET password_hash = :h, must_change_pw = 1 WHERE id = :id')
            ->execute([':h' => $hash, ':id' => $p['id']]);
        $pdo->prepare('DELETE FROM personal_access_tokens WHERE user_id = :id')
            ->execute([':id' => $p['id']]);

        ActivityLog::record((int)$actor['id'], 'users.reset_password', 'user', (string)$p['id']);
        Response::ok([
            'temp_password' => $tempPassword,
            'message' => 'Password reset. Share securely; it must be changed on next login.',
        ]);
    }

    public function roles(): void
    {
        Auth::requirePermission('users.view');
        $rows = Database::connect()->query('SELECT id, code, name, category FROM roles ORDER BY name')->fetchAll();
        Response::ok($rows);
    }

    private function syncRoles(\PDO $pdo, int $userId, array $roleCodes): void
    {
        $in = implode(',', array_fill(0, count($roleCodes), '?'));
        $stmt = $pdo->prepare("SELECT id, code FROM roles WHERE code IN ($in)");
        $stmt->execute(array_values($roleCodes));
        $found = $stmt->fetchAll();
        if (count($found) !== count($roleCodes)) {
            Response::error(422, 'INVALID_ROLE', 'One or more roles are invalid.');
        }
        $pdo->prepare('DELETE FROM user_roles WHERE user_id = :id')->execute([':id' => $userId]);
        $assign = $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)');
        foreach ($found as $role) {
            $assign->execute([':u' => $userId, ':r' => $role['id']]);
        }
    }
}
