<?php
declare(strict_types=1);

namespace ePeddlers\Controllers;

use ePeddlers\ActivityLog;
use ePeddlers\Auth;
use ePeddlers\Config;
use ePeddlers\Database;
use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Support;

final class DocumentController
{
    /** PUBLIC: upload a requirement document for an application (multipart/form-data). */
    public function upload(array $p): void
    {
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT id, status FROM applications WHERE application_code = :c');
        $stmt->execute([':c' => $p['code']]);
        $app = $stmt->fetch();
        if (!$app) {
            Response::error(404, 'NOT_FOUND', 'Application not found.');
        }

        if (!in_array($app['status'], ['draft', 'incomplete_requires_correction'], true)) {
            Response::error(422, 'INVALID_STATE', 'Documents can only be uploaded before/for correction.');
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error(422, 'UPLOAD_FAILED', 'No valid file was uploaded.');
        }
        $file = $_FILES['file'];
        $docType = substr(trim((string)($_POST['doc_type'] ?? 'document')), 0, 80);

        $maxSize = (int)Support::setting('uploads.max_size_bytes', '5242880');
        if ($file['size'] > $maxSize) {
            Response::error(422, 'FILE_TOO_LARGE', 'File exceeds the maximum allowed size.');
        }

        $allowed = array_filter(array_map('trim', explode(',', (string)Support::setting('uploads.allowed_mimes', 'image/jpeg,image/png,application/pdf'))));
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string)$finfo->file($file['tmp_name']);
        if (!in_array($mime, $allowed, true)) {
            Response::error(422, 'INVALID_FILE_TYPE', 'This file type is not allowed.');
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'application/pdf' => 'pdf',
            default => 'bin',
        };

        $storageRoot = rtrim((string)Config::get('STORAGE_PATH'), '/\\');
        $dir = $storageRoot . '/applications/' . $app['id'];
        if (!is_dir($dir) && !mkdir($dir, 0770, true) && !is_dir($dir)) {
            Response::error(500, 'STORAGE_ERROR', 'Could not prepare storage.');
        }
        $storedName = bin2hex(random_bytes(16)) . '.' . $ext;
        $target = $dir . '/' . $storedName;

        if (!move_uploaded_file($file['tmp_name'], $target)) {
            Response::error(500, 'STORAGE_ERROR', 'Could not store the uploaded file.');
        }

        $relative = 'applications/' . $app['id'] . '/' . $storedName;
        $ins = $pdo->prepare(
            'INSERT INTO application_documents (application_id, doc_type, original_name, stored_path, mime_type, size_bytes)
             VALUES (:app, :type, :orig, :path, :mime, :size)'
        );
        $ins->execute([
            ':app' => $app['id'], ':type' => $docType,
            ':orig' => substr((string)$file['name'], 0, 255),
            ':path' => $relative, ':mime' => $mime, ':size' => (int)$file['size'],
        ]);
        $docId = (int)$pdo->lastInsertId();

        ActivityLog::record(null, 'application.document_upload', 'application', (string)$app['id'],
            null, ['doc_id' => $docId, 'doc_type' => $docType]);

        Response::created([
            'id' => $docId, 'doc_type' => $docType,
            'original_name' => $file['name'], 'size_bytes' => (int)$file['size'],
            'message' => 'Document uploaded.',
        ]);
    }

    /** AUTH: download a document (access-controlled). */
    public function download(array $p): void
    {
        Auth::requirePermission('applications.view');
        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM application_documents WHERE id = :id');
        $stmt->execute([':id' => $p['id']]);
        $doc = $stmt->fetch();
        if (!$doc) {
            Response::error(404, 'NOT_FOUND', 'Document not found.');
        }

        $storageRoot = rtrim((string)Config::get('STORAGE_PATH'), '/\\');
        $full = $storageRoot . '/' . $doc['stored_path'];
        $real = realpath($full);
        // Prevent path traversal: resolved path must stay inside storage root.
        if ($real === false || !str_starts_with($real, (string)realpath($storageRoot))) {
            Response::error(404, 'NOT_FOUND', 'Document file is missing.');
        }

        header('Content-Type: ' . $doc['mime_type']);
        header('Content-Disposition: inline; filename="' . basename($doc['original_name']) . '"');
        header('Content-Length: ' . (string)filesize($real));
        header('X-Content-Type-Options: nosniff');
        readfile($real);
        exit;
    }
}
