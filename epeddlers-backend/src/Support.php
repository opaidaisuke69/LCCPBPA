<?php
declare(strict_types=1);

namespace ePeddlers;

/**
 * Shared helpers: pagination parsing, code generation, settings access.
 */
final class Support
{
    /** Parse ?page & ?per_page into [page, perPage, offset]. */
    public static function pagination(int $defaultPer = 20, int $maxPer = 100): array
    {
        $page = max(1, (int)Request::query('page', 1));
        $per  = (int)Request::query('per_page', $defaultPer);
        $per  = max(1, min($maxPer, $per));
        return [$page, $per, ($page - 1) * $per];
    }

    /** Meta block for paginated responses. */
    public static function pageMeta(int $page, int $perPage, int $total): array
    {
        return [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => (int)ceil($total / max(1, $perPage)),
        ];
    }

    /** Non-sequential, human-safe-ish code, e.g. EP-7F3K9Q2A. */
    public static function randomCode(string $prefix, int $len = 8): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
        $out = '';
        $max = strlen($alphabet) - 1;
        for ($i = 0; $i < $len; $i++) {
            $out .= $alphabet[random_int(0, $max)];
        }
        return $prefix . '-' . $out;
    }

    public static function randomPin(int $len = 6): string
    {
        $out = '';
        for ($i = 0; $i < $len; $i++) {
            $out .= (string)random_int(0, 9);
        }
        return $out;
    }

    /**
     * A non-sequential numeric string of the given length.
     * First digit is 1-9 so the ID keeps its full length (e.g. 16 digits).
     */
    public static function randomDigits(int $len = 16): string
    {
        $out = (string)random_int(1, 9);
        for ($i = 1; $i < $len; $i++) {
            $out .= (string)random_int(0, 9);
        }
        return $out;
    }

    public static function setting(string $key, ?string $default = null): ?string
    {
        $stmt = Database::connect()->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k');
        $stmt->execute([':k' => $key]);
        $val = $stmt->fetchColumn();
        return $val === false ? $default : (string)$val;
    }

    public static function nowUtc(): string
    {
        return gmdate('Y-m-d H:i:s');
    }
}
