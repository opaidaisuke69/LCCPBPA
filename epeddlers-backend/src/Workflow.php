<?php
declare(strict_types=1);

namespace ePeddlers;

use PDO;

/**
 * Server-controlled application status machine.
 * Records every transition into application_status_history.
 */
final class Workflow
{
    public const STATUSES = [
        'draft', 'submitted', 'under_initial_review', 'incomplete_requires_correction',
        'pending_inspection', 'inspection_approved', 'inspection_rejected',
        'pending_sanitary_review', 'sanitary_approved', 'sanitary_rejected',
        'awaiting_payment', 'payment_verification_pending', 'payment_cleared',
        'ready_for_final_approval', 'approved', 'permit_issued',
        'rejected', 'cancelled', 'expired',
    ];

    /** Allowed transitions: from => [to, ...]. */
    public const TRANSITIONS = [
        'draft' => ['submitted', 'cancelled'],
        'submitted' => ['under_initial_review', 'cancelled'],
        'under_initial_review' => ['pending_inspection', 'incomplete_requires_correction', 'rejected'],
        'incomplete_requires_correction' => ['submitted', 'cancelled'],
        'pending_inspection' => ['inspection_approved', 'inspection_rejected', 'incomplete_requires_correction'],
        'inspection_approved' => ['pending_sanitary_review'],
        'inspection_rejected' => ['incomplete_requires_correction', 'rejected'],
        'pending_sanitary_review' => ['sanitary_approved', 'sanitary_rejected', 'incomplete_requires_correction'],
        'sanitary_approved' => ['awaiting_payment'],
        'sanitary_rejected' => ['incomplete_requires_correction', 'rejected'],
        'awaiting_payment' => ['payment_verification_pending'],
        'payment_verification_pending' => ['payment_cleared', 'awaiting_payment'],
        'payment_cleared' => ['ready_for_final_approval'],
        'ready_for_final_approval' => ['approved', 'rejected'],
        'approved' => ['permit_issued'],
        'permit_issued' => ['expired', 'cancelled'],
        'rejected' => [],
        'cancelled' => [],
        'expired' => [],
    ];

    public static function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    /**
     * Transition an application with an optimistic check on its current status.
     * Caller supplies $expectedFrom to guard against concurrent overwrites.
     */
    public static function transition(
        PDO $pdo,
        int $applicationId,
        string $expectedFrom,
        string $to,
        ?int $actorId,
        ?string $department = null,
        ?string $remarks = null,
        bool $publicVisible = false
    ): void {
        if (!in_array($to, self::STATUSES, true)) {
            Response::error(422, 'INVALID_STATUS', 'Unknown target status.');
        }
        if (!self::canTransition($expectedFrom, $to)) {
            Response::error(422, 'INVALID_TRANSITION',
                "Cannot move from '$expectedFrom' to '$to'.");
        }

        // Optimistic concurrency: only update if still in expected status.
        $upd = $pdo->prepare(
            'UPDATE applications SET status = :to, decided_at = CASE WHEN :to2 IN
                ("approved","rejected","permit_issued","cancelled") THEN UTC_TIMESTAMP() ELSE decided_at END
             WHERE id = :id AND status = :from'
        );
        $upd->execute([':to' => $to, ':to2' => $to, ':id' => $applicationId, ':from' => $expectedFrom]);

        if ($upd->rowCount() === 0) {
            Response::error(409, 'CONFLICT',
                'The application status changed since you last loaded it. Please refresh.');
        }

        $hist = $pdo->prepare(
            'INSERT INTO application_status_history
                (application_id, from_status, to_status, department, changed_by, remarks, public_visible)
             VALUES (:app, :from, :to, :dept, :by, :remarks, :pub)'
        );
        $hist->execute([
            ':app' => $applicationId, ':from' => $expectedFrom, ':to' => $to,
            ':dept' => $department, ':by' => $actorId, ':remarks' => $remarks,
            ':pub' => $publicVisible ? 1 : 0,
        ]);

        ActivityLog::record($actorId, 'application.status_change', 'application', (string)$applicationId,
            ['status' => $expectedFrom], ['status' => $to, 'remarks' => $remarks]);
    }
}
