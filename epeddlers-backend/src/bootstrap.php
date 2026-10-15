<?php
declare(strict_types=1);

/**
 * Bootstrap: PSR-4-ish autoloader, env, error handling, timezone.
 */

use ePeddlers\Config;
use ePeddlers\Response;

define('EP_ROOT', dirname(__DIR__));

spl_autoload_register(static function (string $class): void {
    $prefix = 'ePeddlers\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

Config::load(EP_ROOT);
date_default_timezone_set((string)Config::get('APP_TIMEZONE', 'Asia/Manila'));

// Never leak stack traces to clients.
set_exception_handler(static function (\Throwable $e): void {
    error_log('[ePeddlers] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (Config::bool('APP_DEBUG')) {
        Response::error(500, 'SERVER_ERROR', $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
    }
    Response::error(500, 'SERVER_ERROR', 'An unexpected error occurred.');
});

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});
