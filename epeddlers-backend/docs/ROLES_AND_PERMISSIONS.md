# Role & Permission Matrix

Three top-level categories; Administrative has two operational subroles. Roles are
assigned via `user_roles`; permissions via `role_permissions`. All checks are
enforced server-side.

## Roles

| Code | Category | Surface | Purpose |
|------|----------|---------|---------|
| `admin` | admin | Web | Supervises the entire system |
| `treasury` | treasury | Web | Payment verification & collection records |
| `inspection_officer` | administrative | Mobile | General inspections |
| `sanitary_officer` | administrative | Mobile | Sanitary reviews |

## Permission matrix

| Permission | admin | treasury | inspection_officer | sanitary_officer |
|------------|:---:|:---:|:---:|:---:|
| `users.manage` | ✓ | | | |
| `users.view` | ✓ | | | |
| `applications.view` | ✓ | ✓ | ✓ | ✓ |
| `applications.review` | ✓ | | | |
| `applications.approve` | ✓ | | | |
| `applications.reject` | ✓ | | | |
| `inspections.conduct` | ✓ | | ✓ | |
| `sanitary.conduct` | ✓ | | | ✓ |
| `treasury.verify` | ✓ | ✓ | | |
| `treasury.collect` | ✓ | ✓ | | |
| `treasury.reports` | ✓ | ✓ | | |
| `collections.record` | ✓ | | ✓ | |
| `qr.resolve` | ✓ | ✓ | ✓ | ✓ |
| `violations.record` | ✓ | | ✓ | |
| `violations.view` | ✓ | | ✓ | ✓ |
| `reports.view` | ✓ | ✓ | | |
| `activity.view` | ✓ | | | |
| `settings.manage` | ✓ | | | |

## Guardrails

- Inspection and Sanitary roles are independent; neither grants the other's permissions.
- Neither Administrative subrole gets Treasury or Admin privileges by default.
- Treasury cannot manage users, perform inspections/sanitary reviews, or issue permits.
- `collections.record` (mobile) is separate from `treasury.collect` (web). Both can be
  granted per approved policy; the default above wires collection to inspection officers
  as an example and can be reconfigured by an admin.

> The default collection assignment is a configurable starting point, not official
> city policy. Adjust `role_permissions` to match La Carlota City's approved scheme.
