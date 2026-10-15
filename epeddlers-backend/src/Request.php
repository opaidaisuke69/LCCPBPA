<?php
declare(strict_types=1);

namespace ePeddlers;

/**
 * Request helpers: JSON body parsing, query params, bearer token, validation.
 */
final class Request
{
    private static ?array $body = null;

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function body(): array
    {
        if (self::$body !== null) {
            return self::$body;
        }
        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') {
            return self::$body = [];
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            Response::error(400, 'INVALID_JSON', 'Request body must be valid JSON.');
        }
        return self::$body = $decoded;
    }

    public static function input(string $key, mixed $default = null): mixed
    {
        return self::body()[$key] ?? $default;
    }

    public static function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    public static function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if ($header === '' && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    public static function idempotencyKey(): ?string
    {
        $key = $_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? null;
        return $key ? substr(trim($key), 0, 80) : null;
    }

    /**
     * Validate the request body against a simple rule set.
     * Rules: 'required', 'string', 'int', 'numeric', 'email', 'in:a,b,c', 'max:N'
     * Returns the validated, trimmed values.
     */
    public static function validate(array $rules): array
    {
        $body = self::body();
        $out = [];
        $errors = [];

        foreach ($rules as $field => $ruleStr) {
            $value = $body[$field] ?? null;
            $parts = explode('|', $ruleStr);
            $required = in_array('required', $parts, true);

            if ($value === null || $value === '') {
                if ($required) {
                    $errors[$field] = 'This field is required.';
                }
                $out[$field] = null;
                continue;
            }

            if (is_string($value)) {
                $value = trim($value);
            }

            foreach ($parts as $rule) {
                if ($rule === 'email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = 'Must be a valid email.';
                } elseif ($rule === 'int' && !preg_match('/^-?\d+$/', (string)$value)) {
                    $errors[$field] = 'Must be an integer.';
                } elseif ($rule === 'numeric' && !is_numeric($value)) {
                    $errors[$field] = 'Must be numeric.';
                } elseif (str_starts_with($rule, 'in:')) {
                    $allowed = explode(',', substr($rule, 3));
                    if (!in_array((string)$value, $allowed, true)) {
                        $errors[$field] = 'Invalid value.';
                    }
                } elseif (str_starts_with($rule, 'max:')) {
                    if (mb_strlen((string)$value) > (int)substr($rule, 4)) {
                        $errors[$field] = 'Value is too long.';
                    }
                }
            }
            $out[$field] = $value;
        }

        if ($errors) {
            Response::error(422, 'VALIDATION_FAILED', 'The submitted data is invalid.', $errors);
        }
        return $out;
    }
}
