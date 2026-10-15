<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\Auth;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;

final class QrController
{
    /**
     * Resolve a permit's non-guessable QR reference to authorized peddler info.
     * Returns different fields depending on the caller's permissions.
     */
    public function resolve(): void
    {
        $user = Auth::requirePermission('qr.resolve');
        $v = Request::validate(['qr_reference' => 'required|string|max:120']);
        $pdo = Database::connect();

        $stmt = $pdo->prepare(
            'SELECT p.id AS permit_id, p.permit_code, p.status AS permit_status, p.valid_from, p.valid_to,
                    pe.id AS peddler_id, pe.peddler_code, pe.full_name,
                    a.application_code
             FROM permits p
             JOIN peddlers pe ON pe.id = p.peddler_id
             JOIN applications a ON a.id = p.application_id
             WHERE p.qr_reference = :qr'
        );
        $stmt->execute([':qr' => $v['qr_reference']]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error(404, 'INVALID_QR', 'Unknown or invalid QR code.');
        }

        // Validity assessment.
        $today = date('Y-m-d');
        $validity = 'valid';
        if ($row['permit_status'] === 'revoked') {
            $validity = 'revoked';
        } elseif ($row['permit_status'] === 'expired' || $row['valid_to'] < $today) {
            $validity = 'expired';
        } elseif ($row['valid_from'] > $today) {
            $validity = 'not_yet_valid';
        }

        $result = [
            'peddler_code' => $row['peddler_code'],
            'full_name' => $row['full_name'],
            'application_code' => $row['application_code'],
            'permit_code' => $row['permit_code'],
            'permit_status' => $row['permit_status'],
            'validity' => $validity,
            'valid_from' => $row['valid_from'],
            'valid_to' => $row['valid_to'],
        ];

        // Payment status only for treasury-authorized roles.
        if (in_array('treasury.verify', $user['permissions'], true)) {
            $pay = $pdo->prepare(
                "SELECT COUNT(*) FROM payment_records WHERE application_id =
                   (SELECT application_id FROM permits WHERE id = :pid) AND status = 'verified'"
            );
            $pay->execute([':pid' => $row['permit_id']]);
            $result['payment_status'] = ((int)$pay->fetchColumn() > 0) ? 'paid' : 'unpaid';
        }

        // Violation status only for roles that can view violations.
        if (in_array('violations.view', $user['permissions'], true)) {
            $vio = $pdo->prepare(
                "SELECT COUNT(*) FROM violations WHERE peddler_id = :ped AND resolution_status = 'open'"
            );
            $vio->execute([':ped' => $row['peddler_id']]);
            $result['open_violations'] = (int)$vio->fetchColumn();
        }

        Response::ok($result);
    }
}
