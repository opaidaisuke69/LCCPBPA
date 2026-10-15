<?php
declare(strict_types=1);

namespace ePeddlers;

/**
 * Consistent JSON responses and CORS handling.
 */
final class Response
{
    public static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = array_filter(array_map('trim', explode(',', (string)Config::get('CORS_ALLOWED_ORIGINS'))));

        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
        }
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Idempotency-Key');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    public static function json(int $status, array $payload): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok(mixed $data = null, array $meta = []): never
    {
        $body = ['success' => true, 'data' => $data];
        if ($meta) {
            $body['meta'] = $meta;
        }
        self::json(200, $body);
    }

    public static function created(mixed $data = null): never
    {
        self::json(201, ['success' => true, 'data' => $data]);
    }

    public static function error(int $status, string $code, string $message, array $details = []): never
    {
        $body = ['success' => false, 'error' => ['code' => $code, 'message' => $message]];
        if ($details) {
            $body['error']['details'] = $details;
        }
        self::json($status, $body);
    }
}
