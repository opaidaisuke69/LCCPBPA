# Vendor & Facility Mapping — STANDBY

Mapping is intentionally **not active** in this release. No map provider, API key,
or live map integration is required. This document records the prepared integration
points so mapping can be added later without schema churn.

## Current behavior

- `system_settings.mapping.enabled = 0`.
- Applicants provide a free-text `preferred_location`, or (optionally) an
  administrator-configured zone can be selected later. No coordinates are fabricated.
- The UI shows no map; the application form's location step is a plain description field.

## Reserved database structures

| Table / column | Purpose (future) |
|----------------|------------------|
| `vending_zones` | Named zones; `geojson` column reserved for geometry |
| `peddlers.latitude`, `peddlers.longitude` | Peddler location (nullable) |
| `peddlers.vending_zone_id` | Link a peddler to a zone |
| `applications.vending_zone_id` | Requested zone on an application |

These are nullable and unused by the initial release.

## Enabling mapping later (outline)

1. Choose an approved map provider; store any key server-side (never in the client bundle
   or the QR code).
2. Set `system_settings.mapping.enabled = 1`.
3. Populate `vending_zones` (and `geojson`) with approved zones.
4. Add a map step to the application form and an admin zone editor.
5. Add read endpoints for zones/geometry; keep write access permission-gated.
6. Do not expose confidential applicant data via map features; reuse the existing
   permission checks.

## Explicit non-goals for this release

- No fabricated vending locations, coordinates, or facility availability.
- No dependency on a third-party map service to run or deploy the system.
