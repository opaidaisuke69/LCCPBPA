<?php
declare(strict_types=1);

namespace ePeddlers;

/**
 * Minimal .env loader and config accessor.
 */
final class Config
{
    private static array $data = [];

    public static function load(string $root): void
    {
        $defaults = [
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_TIMEZONE' => 'Asia/Manila',
            'CORS_ALLOWED_ORIGINS' => '',
            'DB_HOST' => '127.0.0.1',
            'DB_PORT' => '3306',
            'DB_NAME' => 'epeddlers',
            'DB_USER' => 'root',
            'DB_PASS' => '',
            'STORAGE_PATH' => $root . '/storage',
            'TOKEN_TTL' => '0',
        ];

        $envFile = $root . '/.env';
        $parsed = [];
        if (is_file($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                $pos = strpos($line, '=');
                if ($pos === false) {
                    continue;
                }
                $key = trim(substr($line, 0, $pos));
                $val = trim(substr($line, $pos + 1));
                $val = trim($val, "\"'");
                $parsed[$key] = $val;
            }
        }

        self::$data = array_merge($defaults, $parsed);
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return self::$data[$key] ?? $default;
    }

    public static function bool(string $key): bool
    {
        return in_array(strtolower((string)(self::$data[$key] ?? '')), ['1', 'true', 'yes'], true);
    }

    public static function int(string $key, int $default = 0): int
    {
        return isset(self::$data[$key]) ? (int)self::$data[$key] : $default;
    }
}
