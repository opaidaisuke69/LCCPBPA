# ePeddlers — Architecture Overview

La Carlota City Peddler Business Permit Application and Vendor Mapping System.

## Project layout

```
LCCPBPA/
  epeddlers-backend/     PHP REST API + MySQL schema/seed + docs
    public/              Front controller (index.php) — the ONLY web-reachable dir
    src/                 Application code (autoloaded, namespace ePeddlers\)
      Controllers/       Request handlers grouped by domain
    database/            schema.sql, seed.sql, reset.sql, user seed generator
    storage/             Private uploaded files (NOT web-reachable)
    docs/                This documentation
  epeddlers-web/         React + Vite admin & treasury web app
  epeddlers-mob/         React Native + Expo administrative mobile app
```

The web app, mobile app, API, and database are independent and communicate only
over the versioned JSON REST API at `/api/v1`.

## Backend stack

- PHP 8.2 (XAMPP), no framework — small custom core for transparency and control.
- MariaDB 10.4 / MySQL, InnoDB, utf8mb4.
- PDO with prepared statements everywhere (`ATTR_EMULATE_PREPARES = false`).
- Opaque bearer-token auth. Tokens are random 32-byte strings; only the SHA-256
  hash is stored in `personal_access_tokens`. This avoids CSRF-cookie complexity
  and works uniformly for the Vite web app and the Expo mobile app (SecureStore).

### Core components (`src/`)

| File | Responsibility |
|------|----------------|
| `Config.php` | Loads `.env`, typed accessors |
| `Database.php` | PDO singleton, UTC session time zone |
| `Request.php` | JSON body parsing, query params, bearer token, validation |
| `Response.php` | Consistent JSON envelopes, CORS, status codes |
| `Auth.php` | Token issue/revoke, current user, role & permission checks |
| `ActivityLog.php` | Append-only audit entries |
| `Router.php` | Regex route matching with `{param}` support |
| `bootstrap.php` | Autoloader, env, error/exception handling, timezone |
| `routes.php` | API v1 route table |

## Response envelope

Success:
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "total": 42 } }
```
Error:
```json
{ "success": false, "error": { "code": "VALIDATION_FAILED", "message": "...", "details": { } } }
```

## Time & money conventions

- Timestamps stored in UTC (`SET time_zone = '+00:00'`); presented in `Asia/Manila`.
- Money stored as `DECIMAL(12,2)`. Payment state is modeled by real
  `payment_records` + `payment_verifications` rows — never a boolean on an application.

## Security posture

- All privileged actions enforced server-side via `Auth::requirePermission()`.
- Passwords hashed with `password_hash()` (bcrypt), verified with `password_verify()`.
- Uploads stored under `storage/` (outside the web root); downloads are access-controlled.
- Only `public/` is exposed; the backend root denies direct web access via `.htaccess`.
- Stack traces are never returned unless `APP_DEBUG=true` (development only).

## Mapping (STANDBY)

`vending_zones`, `peddlers.latitude/longitude`, and `applications.vending_zone_id`
exist but are unused in the initial release (`system_settings.mapping.enabled = 0`).
No map provider or API key is required.
