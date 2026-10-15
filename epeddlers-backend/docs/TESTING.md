# ePeddlers — Testing

The API ships with a self-contained HTTP test suite (no external dependencies) that
exercises the areas the specification requires.

## Running

1. Start the backend (and ensure the dev database is seeded):

   ```powershell
   C:\xampp\php\php.exe -S 127.0.0.1:8099 -t public
   ```

2. In another terminal, run:

   ```powershell
   C:\xampp\php\php.exe tests\run.php
   # or against another environment:
   C:\xampp\php\php.exe tests\run.php https://api.epeddlers.example/api/v1
   ```

Exit code is `0` when all tests pass, non-zero otherwise (CI-friendly).

## Coverage

| Area | What it checks |
|------|----------------|
| Health | API responds |
| Authentication | invalid credentials → 401, unauthenticated `/me` → 401, all dev roles log in |
| Permissions / RBAC | inspector & treasury cannot create users; sanitary cannot inspect; inspector cannot read activity logs |
| API validation | invalid/missing application fields → 422 |
| Workflow | create → submit → review → inspection → sanitary → payment clearance → approval → permit issued; wrong tracking PIN → 404; approve-before-ready → 422 |
| Financial | collection amount is server-authoritative; idempotency key prevents double collection |
| Saturday report | weekly report viewable any day; official generation blocked on non-Saturday (422), allowed on Saturday |
| Reports | applications / collections / violations reports return 200 |
| Notifications | list + unread count |

## Notes

- Tests run against a live server and dev database; they are additive. Use a
  development database, not production data.
- The financial test is skipped gracefully if no arkabala fee amount is configured
  (seed sets fees to 0.00 as placeholders).
- The data-layer logic (status machine, permissions) is also enforced server-side, so
  these HTTP tests validate the real authorization and transition paths end to end.
