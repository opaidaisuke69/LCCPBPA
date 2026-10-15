<?php
declare(strict_types=1);

namespace ePeddlers;

use PDO;
use PDOException;

/**
 * PDO connection factory (MySQL/MariaDB) with prepared-statement defaults.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function connect(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            Config::get('DB_HOST'),
            Config::get('DB_PORT'),
            Config::get('DB_NAME')
        );

        try {
            self::$pdo = new PDO($dsn, Config::get('DB_USER'), Config::get('DB_PASS'), [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            // Store/compare timestamps in UTC regardless of server tz.
            self::$pdo->exec("SET time_zone = '+00:00'");
        } catch (PDOException $e) {
            Response::error(500, 'DB_CONNECTION_FAILED',
                Config::bool('APP_DEBUG') ? $e->getMessage() : 'Database connection failed.');
        }

        return self::$pdo;
    }
}
