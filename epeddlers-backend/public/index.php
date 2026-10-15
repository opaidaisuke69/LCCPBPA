<?php
declare(strict_types=1);

/**
 * ePeddlers API - single public entrypoint.
 * All requests under /api/v1 are routed here.
 */

require dirname(__DIR__) . '/src/bootstrap.php';

use ePeddlers\Request;
use ePeddlers\Response;
use ePeddlers\Router;

Response::cors();

$router = new Router();
require dirname(__DIR__) . '/src/routes.php';

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Strip a base path if the API is served from a subdirectory (XAMPP htdocs).
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($base !== '' && str_starts_with($uri, $base)) {
    $uri = substr($uri, strlen($base));
}

$router->dispatch(Request::method(), $uri);
