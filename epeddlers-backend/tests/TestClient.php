<?php
declare(strict_types=1);

/**
 * Minimal HTTP test client + assertion harness for the ePeddlers API.
 * No external dependencies; uses cURL against a running server.
 */

final class TestClient
{
    private ?string $token = null;

    public function __construct(private string $base) {}

    public function withToken(?string $token): self
    {
        $c = new self($this->base);
        $c->token = $token;
        return $c;
    }

    public function request(string $method, string $path, ?array $body = null, array $headers = []): array
    {
        $ch = curl_init($this->base . $path);
        $hdrs = ['Content-Type: application/json', 'Accept: application/json'];
        if ($this->token) {
            $hdrs[] = 'Authorization: Bearer ' . $this->token;
        }
        foreach ($headers as $k => $v) {
            $hdrs[] = "$k: $v";
        }
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $hdrs,
            CURLOPT_TIMEOUT => 20,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            throw new RuntimeException("Request failed: $err");
        }
        $json = json_decode((string)$raw, true);
        return ['status' => $status, 'body' => is_array($json) ? $json : [], 'raw' => $raw];
    }

    public function login(string $username, string $password): self
    {
        $res = $this->request('POST', '/auth/login', ['username' => $username, 'password' => $password]);
        if ($res['status'] !== 200) {
            throw new RuntimeException("Login failed for $username: {$res['raw']}");
        }
        return $this->withToken($res['body']['data']['token']);
    }
}

final class Assert
{
    public static int $passed = 0;
    public static int $failed = 0;
    /** @var string[] */
    public static array $failures = [];

    public static function ok(bool $cond, string $message): void
    {
        if ($cond) {
            self::$passed++;
            fwrite(STDOUT, "  PASS: $message\n");
        } else {
            self::$failed++;
            self::$failures[] = $message;
            fwrite(STDOUT, "  FAIL: $message\n");
        }
    }

    public static function status(array $res, int $expected, string $message): void
    {
        self::ok($res['status'] === $expected, "$message (expected $expected, got {$res['status']})");
    }

    public static function summary(): int
    {
        $total = self::$passed + self::$failed;
        fwrite(STDOUT, "\n==== $total tests · " . self::$passed . " passed · " . self::$failed . " failed ====\n");
        return self::$failed === 0 ? 0 : 1;
    }
}
