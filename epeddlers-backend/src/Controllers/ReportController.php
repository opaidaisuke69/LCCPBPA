<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

/**
 * Consolidated, filterable reports. Totals come from DB queries and respect
 * the supplied date ranges and filters.
 */
final class ReportController
{
    public function applications(): void
    {
        Auth::requirePermission('reports.view');
        $pdo = Database::connect();
        [$where, $params] = $this->dateRange('created_at');

        $type = trim((string)Request::query('type', ''));
        if (in_array($type, ['new', 'renewal'], true)) {
            $where[] = 'type = :ty';
            $params[':ty'] = $type;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $byStatus = [];
        $stmt = $pdo->prepare("SELECT status, COUNT(*) c FROM applications $whereSql GROUP BY status");
        $stmt->execute($params);
        foreach ($stmt as $r) {
            $byStatus[$r['status']] = (int)$r['c'];
        }

        $rows = $pdo->prepare(
            "SELECT application_code, type, status, applicant_name, business_name, submitted_at, created_at
             FROM applications $whereSql ORDER BY created_at DESC LIMIT 1000"
        );
        $rows->execute($params);

        Response::ok([
            'summary' => [
                'total' => array_sum($byStatus),
                'by_status' => $byStatus,
            ],
            'rows' => $rows->fetchAll(),
        ]);
    }

    public function collections(): void
    {
        Auth::requirePermission('reports.view');
        $pdo = Database::connect();
        [$where, $params] = $this->dateRange('collected_at', 'ct');
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $totals = $pdo->prepare(
            "SELECT ct.status, COUNT(*) c, COALESCE(SUM(ct.amount),0) total
             FROM collection_transactions ct $whereSql GROUP BY ct.status"
        );
        $totals->execute($params);
        $byStatus = [];
        foreach ($totals as $r) {
            $byStatus[$r['status']] = ['count' => (int)$r['c'], 'total' => (float)$r['total']];
        }

        $rows = $pdo->prepare(
            "SELECT ct.txn_ref, ct.amount, ct.status, ct.collected_at, ct.collection_week,
                    pe.full_name AS peddler, fc.name AS category, u.full_name AS officer
             FROM collection_transactions ct
             JOIN peddlers pe ON pe.id = ct.peddler_id
             JOIN fee_categories fc ON fc.id = ct.fee_category_id
             JOIN users u ON u.id = ct.collected_by
             $whereSql ORDER BY ct.collected_at DESC LIMIT 1000"
        );
        $rows->execute($params);

        Response::ok([
            'summary' => ['by_status' => $byStatus, 'successful_total' => $byStatus['success']['total'] ?? 0.0],
            'rows' => $rows->fetchAll(),
        ]);
    }

    public function inspections(): void
    {
        Auth::requirePermission('reports.view');
        $pdo = Database::connect();
        [$where, $params] = $this->dateRange('inspected_at', 'i');
        $where[] = "i.status = 'submitted'";
        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $rows = $pdo->prepare(
            "SELECT a.application_code, a.applicant_name, i.compliance, i.recommendation,
                    i.inspected_at, u.full_name AS officer
             FROM inspections i
             JOIN applications a ON a.id = i.application_id
             LEFT JOIN users u ON u.id = i.officer_id
             $whereSql ORDER BY i.inspected_at DESC LIMIT 1000"
        );
        $rows->execute($params);
        $data = $rows->fetchAll();

        $summary = ['approve' => 0, 'reject' => 0, 'return' => 0];
        foreach ($data as $r) {
            if (isset($summary[$r['recommendation']])) {
                $summary[$r['recommendation']]++;
            }
        }
        Response::ok(['summary' => $summary, 'rows' => $data]);
    }

    public function violations(): void
    {
        Auth::requirePermission('reports.view');
        $pdo = Database::connect();
        [$where, $params] = $this->dateRange('v.created_at');
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $rows = $pdo->prepare(
            "SELECT vc.name AS category, v.violation_date, v.resolution_status, v.penalty_amount,
                    v.payment_status, pe.full_name AS peddler, u.full_name AS recorder
             FROM violations v
             JOIN violation_categories vc ON vc.id = v.category_id
             LEFT JOIN peddlers pe ON pe.id = v.peddler_id
             LEFT JOIN users u ON u.id = v.recorded_by
             $whereSql ORDER BY v.violation_date DESC LIMIT 1000"
        );
        $rows->execute($params);
        $data = $rows->fetchAll();

        $summary = ['open' => 0, 'resolved' => 0, 'dismissed' => 0, 'penalty_total' => 0.0];
        foreach ($data as $r) {
            if (isset($summary[$r['resolution_status']])) {
                $summary[$r['resolution_status']]++;
            }
            $summary['penalty_total'] += (float)($r['penalty_amount'] ?? 0);
        }
        Response::ok(['summary' => $summary, 'rows' => $data]);
    }

    /** Build a date-range WHERE clause from ?from and ?to (local business dates). */
    private function dateRange(string $column, ?string $alias = null): array
    {
        $col = $alias ? "$alias.$column" : $column;
        $from = trim((string)Request::query('from', ''));
        $to = trim((string)Request::query('to', ''));
        $where = [];
        $params = [];
        if ($from !== '') {
            $where[] = "$col >= :from";
            $params[':from'] = $from . ' 00:00:00';
        }
        if ($to !== '') {
            $where[] = "$col <= :to";
            $params[':to'] = $to . ' 23:59:59';
        }
        return [$where, $params];
    }
}
