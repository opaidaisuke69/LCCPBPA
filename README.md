# ePeddlers — La Carlota City Peddler Business Permit Application

A production-oriented web + mobile system to digitize peddler business permit
application, inspection, sanitary review, treasury payment verification, permit
issuance, vendor management, arkabala tax collection, violations, and reporting
for La Carlota City, Negros Occidental.

## Repositories (this workspace)

| Folder | Stack | Purpose |
|--------|-------|---------|
| `epeddlers-backend/` | PHP 8.2 + MariaDB/MySQL | REST API, DB schema/seed, docs, tests |
| `epeddlers-web/` | React 19 + Vite + Tailwind v4 | Public site, Admin & Treasury workspaces |
| `epeddlers-mob/` | React Native + Expo (SDK 57) | Inspection / Sanitary field app |

Each folder has its own README. Start with `epeddlers-backend/README.md`.

## Quick start (development, XAMPP on Windows)

```powershell
# 1) Database (MariaDB running via XAMPP)
cd epeddlers-backend
$mysql = 'C:\xampp\mysql\bin\mysql.exe'
Get-Content database\reset.sql  -Raw | & $mysql -u root
Get-Content database\schema.sql -Raw | & $mysql -u root epeddlers
Get-Content database\seed.sql   -Raw | & $mysql -u root epeddlers
C:\xampp\php\php.exe database\make_seed_users.php | Out-File -Encoding ascii database\seed_users.sql
Get-Content database\seed_users.sql -Raw | & $mysql -u root epeddlers

# 2) API
Copy-Item .env.example .env   # edit if needed
C:\xampp\php\php.exe -S 127.0.0.1:8099 -t public

# 3) Web (new terminal)
cd ..\epeddlers-web
npm install
npm run dev        # proxies /api to the PHP server

# 4) Mobile (new terminal)
cd ..\epeddlers-mob
npm install
npm start
```

Development accounts (temporary — change immediately; see backend README):
`admin / Admin@123`, `treasury / Treasury@123`, `inspector / Inspect@123`,
`sanitary / Sanitary@123`.

## Documentation

- `epeddlers-backend/docs/ARCHITECTURE.md` — system + API design
- `epeddlers-backend/docs/ROLES_AND_PERMISSIONS.md` — role/permission matrix
- `epeddlers-backend/docs/WORKFLOW.md` — application status machine
- `epeddlers-backend/docs/MAPPING.md` — vendor mapping placeholder (STANDBY)
- `epeddlers-backend/docs/TESTING.md` — test suite + coverage
- `epeddlers-backend/docs/DEPLOYMENT.md` — deployment checklist

## Status

All build phases complete and verified against the live stack:

1. Architecture + DB foundation
2. Authentication + RBAC
3. Public application + tracking (+ public web)
4. Admin web (dashboard, users, applications, reports, activity logs)
5. Mobile field app (inspection, sanitary, QR, collection, violations)
6. Treasury web (payment verification, collections, Saturday weekly report)
7. Reports/exports, notifications, automated tests, deployment docs

Vendor/facility mapping is intentionally ON STANDBY and prepared for future
integration without requiring a map provider or API key.

## Key safeguards implemented

- Server-enforced RBAC on every privileged action (no frontend-only checks).
- Inspection and sanitary approvals are independent decisions.
- Treasury payment clearance is separate from final permit issuance.
- Collections are server-authoritative with idempotency to prevent double charging.
- Official weekly report generation is restricted to Saturday (La Carlota time).
- Passwords hashed with bcrypt; uploads validated and stored outside the web root;
  audit logs for sensitive actions; transactional financial operations.
