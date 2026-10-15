<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Response;

final class DashboardController
{
    /** Admin dashboard metrics computed from real data. */
    public function admin(): void
    {
        Auth::requirePermission('reports.view');
        $pdo = Database::connect();

        $byStatus = [];
        foreach ($pdo->query('SELECT status, COUNT(*) c FROM applications GROUP BY status') as $r) {
            $byStatus[$r['status']] = (int)$r['c'];
        }
        $sum = static fn(array $keys) => array_sum(array_map(fn($k) => $byStatus[$k] ?? 0, $keys));

        $peddlers = (int)$pdo->query('SELECT COUNT(*) FROM peddlers')->fetchColumn();
        $totalApps = array_sum($byStatus);
        $violations = (int)$pdo->query('SELECT COUNT(*) FROM violations')->fetchColumn();

        // Collections total (successful only).
        $collections = $pdo->query(
            "SELECT COALESCE(SUM(amount),0) total, COUNT(*) cnt
             FROM collection_transactions WHERE status = 'success'"
        )->fetch();

        // Payment status split by latest verified payments.
        $paid = (int)$pdo->query(
            "SELECT COUNT(DISTINCT application_id) FROM payment_records WHERE status = 'verified'"
        )->fetchColumn();

        $recent = $pdo->query(
            'SELECT a.action, a.entity_type, a.entity_id, a.created_at, u.full_name AS actor
             FROM activity_logs a LEFT JOIN users u ON u.id = a.actor_id
             ORDER BY a.id DESC LIMIT 10'
        )->fetchAll();

        Response::ok([
            'total_peddlers' => $peddlers,
            'total_applications' => $totalApps,
            'pending' => $sum(['submitted', 'under_initial_review']),
            'under_inspection' => $sum(['pending_inspection']),
            'awaiting_sanitary' => $sum(['pending_sanitary_review']),
            'awaiting_payment_verification' => $sum(['awaiting_payment', 'payment_verification_pending']),
            'approved_permits' => $sum(['approved', 'permit_issued']),
            'rejected' => $sum(['rejected']),
            'needs_correction' => $sum(['incomplete_requires_correction']),
            'paid_applications' => $paid,
            'violations' => $violations,
            'collections_total' => (float)$collections['total'],
            'collections_count' => (int)$collections['cnt'],
            'by_status' => $byStatus,
            'recent_activity' => $recent,
        ]);
    }
}
