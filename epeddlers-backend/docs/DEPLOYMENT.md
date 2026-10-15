# ePeddlers — Deployment Checklist

This covers moving from local XAMPP development to a server deployment.

## 1. Environment

- [ ] PHP 8.2+ with PDO MySQL, cURL, and `fileinfo` extensions enabled.
- [ ] MySQL 8 / MariaDB 10.4+.
- [ ] A web server (Apache or Nginx) serving **only** `epeddlers-backend/public`.
- [ ] HTTPS enabled (TLS certificate). The API should not be served over plain HTTP in production.

## 2. Backend configuration

- [ ] Copy `.env.example` to `.env` and set real values:
  - `APP_ENV=production`, `APP_DEBUG=false` (never expose stack traces).
  - `DB_*` for the production database with a **least-privilege** DB user (not root).
  - `CORS_ALLOWED_ORIGINS` = the exact production web origin(s).
  - `STORAGE_PATH` = an absolute path **outside** the web root, writable by PHP.
  - `TOKEN_TTL` = a sensible token lifetime (e.g. `86400` for 24h) if desired.
- [ ] Ensure `storage/` is writable and not web-accessible.
- [ ] Confirm the backend root `.htaccess` (or Nginx rules) denies access to everything except `public/`.

### Apache vhost (example)
```apache
<VirtualHost *:443>
    ServerName api.epeddlers.example
    DocumentRoot "/var/www/epeddlers-backend/public"
    <Directory "/var/www/epeddlers-backend/public">
        AllowOverride All
        Require all granted
    </Directory>
    # TLS config here
</VirtualHost>
```

### Nginx (example)
```nginx
server {
    listen 443 ssl;
    server_name api.epeddlers.example;
    root /var/www/epeddlers-backend/public;
    index index.php;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
    }
}
```

## 3. Database

- [ ] Create the database and a dedicated user with only the needed privileges.
- [ ] Load `database/schema.sql`.
- [ ] Load `database/seed.sql` (roles, permissions, categories, settings).
- [ ] Generate production admin credentials — do **not** use the development seed users.
      Create the first admin via SQL using a real `password_hash()` value, or load
      `seed_users.sql` once and immediately reset every password.
- [ ] Review `system_settings`: timezone, permit numbering, fee schedules, report day.
- [ ] Set real fee amounts in `fee_schedules` per approved city policy (seeded as 0.00).
- [ ] Schedule regular database backups.

## 4. Web app (React/Vite)

- [ ] Build: `npm ci && npm run build` → deploy `dist/` to static hosting or the web server.
- [ ] Point the app's API calls at the production API. In production the dev proxy does
      not apply; serve the SPA and API under the same origin, or configure the client
      base URL / a reverse-proxy for `/api`.
- [ ] Configure SPA fallback so client routes resolve to `index.html`.

## 5. Mobile app (Expo)

- [ ] Set `EXPO_PUBLIC_API_URL` to the production HTTPS API base.
- [ ] Build with EAS (`eas build`) for store distribution, or distribute via Expo Go for pilots.
- [ ] Verify camera permission strings in `app.json`.

## 6. Security verification

- [ ] `APP_DEBUG=false`; confirm errors return generic messages.
- [ ] Confirm privileged endpoints reject unauthorized roles (run `php tests/run.php`).
- [ ] Confirm document downloads require authentication and reject path traversal.
- [ ] Confirm uploads enforce MIME + size limits and store outside the web root.
- [ ] Rotate/replace all development credentials.
- [ ] Consider rate limiting on `/auth/login` at the web-server or WAF layer.

## 7. Post-deploy smoke test

- [ ] `GET /api/v1/health` returns ok.
- [ ] Admin can log in and load the dashboard.
- [ ] A public application can be created, submitted, and tracked.
- [ ] `php tests/run.php https://api.epeddlers.example/api/v1` passes.

## Mapping (STANDBY)

Vendor/facility mapping is intentionally disabled (`system_settings.mapping.enabled = 0`).
The schema reserves `vending_zones`, `peddlers.latitude/longitude`, and
`applications.vending_zone_id` for a future approved integration. No map provider or
API key is required for this release.
