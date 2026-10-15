# ePeddlers Web

React + Vite + Tailwind CSS v4 frontend for the ePeddlers system. Hosts the public
landing/application/tracking site and (in later phases) the Admin and Treasury workspaces.

## Prerequisites

- Node.js 18+
- The ePeddlers PHP backend running (default dev: `http://127.0.0.1:8099`)

## Setup & run

```powershell
npm install
npm run dev
```

The dev server proxies `/api/*` to the PHP backend (see `vite.config.js`). If the
backend runs on a different host/port, update the proxy target there.

## Build

```powershell
npm run build
npm run preview
```

## Structure

```
src/
  lib/        api client (axios + token), auth context, status helpers
  components/ PublicLayout, Toast system, shared UI primitives
  pages/
    public/   Landing, Apply (multi-step form), Track, static pages
    Login.jsx staff login
  App.jsx     routing (public routes + guarded /admin, /treasury)
  index.css   Tailwind v4 + design tokens (official palette)
```

## Design system

Brand palette is defined as Tailwind theme tokens in `index.css`:
primary `#4F7D32`, secondary `#4A943E`, accent `#2A7C13`, dark `#165823`, deep `#1B5E20`.
Reusable classes: `.btn-primary`, `.btn-outline`, `.card`, `.input`, `.label`, `.badge`.

## Implemented

Public (Phase 3):
- Landing with hero, about, how-it-works, draft mission/vision.
- Multi-step permit application (new/renewal) wired to the real API.
- Application tracking by Application ID + PIN, with timeline and document upload.
- Staff login with token auth and role-based redirect.

Admin workspace (Phase 4):
- Dashboard with 3s background polling and real DB metrics.
- Applications monitoring (debounced search, filters, infinite scroll) with a detail
  drawer for review / approve / reject / return actions and timeline.
- User management (create with temp password, activate/deactivate, password reset).
- Read-only activity logs with filtering.

Treasury workspace (Phase 6):
- Dashboard with collection + weekly totals.
- Applicants & payment verification (clears payment separately from permit approval;
  corrections are auditable).
- Collection records with reconciliation (auditable reversal).
- Weekly report: Saturday-only official generation, print + CSV export
  (with formula-injection guard).

Shared infrastructure (`src/lib`):
- `hooks.js` — `usePolling` (3s, pauses when hidden, cancels stale) and `useDebounced`.
- `useInfiniteList.js` — server-paginated infinite scroll with param-reset.
