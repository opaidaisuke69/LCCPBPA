<?php
declare(strict_types=1);

namespace ePeddlers;

/**
 * Tiny regex router. Path params use {name} and are passed as an assoc array.
 */
final class Router
{
    /** @var array<int, array{method:string, pattern:string, handler:callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = ['method' => strtoupper($method), 'pattern' => $pattern, 'handler' => $handler];
    }

    public function get(string $p, callable $h): void    { $this->add('GET', $p, $h); }
    public function post(string $p, callable $h): void   { $this->add('POST', $p, $h); }
    public function put(string $p, callable $h): void    { $this->add('PUT', $p, $h); }
    public function patch(string $p, callable $h): void  { $this->add('PATCH', $p, $h); }
    public function delete(string $p, callable $h): void { $this->add('DELETE', $p, $h); }

    public function dispatch(string $method, string $path): void
    {
        $path = '/' . trim($path, '/');
        $allowedForPath = [];

        foreach ($this->routes as $route) {
            $regex = '#^' . preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $route['pattern']) . '$#';
            if (preg_match($regex, $path, $matches)) {
                $allowedForPath[] = $route['method'];
                if ($route['method'] === $method) {
                    $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                    ($route['handler'])($params);
                    return;
                }
            }
        }

        if ($allowedForPath) {
            Response::error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed for this resource.');
        }
        Response::error(404, 'NOT_FOUND', 'The requested resource was not found.');
    }
}
