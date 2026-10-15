# Application Workflow

Server-controlled, configurable status machine. Status is stored on
`applications.status`; every transition is appended to
`application_status_history` (preserving actor, department, remarks, timestamp,
and public visibility).

## Statuses

```
draft
submitted
under_initial_review
incomplete_requires_correction
pending_inspection
inspection_approved
inspection_rejected
pending_sanitary_review
sanitary_approved
sanitary_rejected
awaiting_payment
payment_verification_pending
payment_cleared
ready_for_final_approval
approved
permit_issued
rejected
cancelled
expired
```

## Typical happy path

```
submitted
  -> under_initial_review              (admin review)
  -> pending_inspection
  -> inspection_approved               (inspection officer, mobile)
  -> pending_sanitary_review
  -> sanitary_approved                 (sanitary officer, mobile)
  -> awaiting_payment
  -> payment_verification_pending      (payment recorded)
  -> payment_cleared                   (treasury verify)
  -> ready_for_final_approval
  -> approved                          (admin)
  -> permit_issued                     (permit row + QR reference created)
```

## Hard rules (enforced in the API, later phases)

1. Inspection approval and sanitary approval are **separate** decisions. A passing
   sanitary review must not override a failed general inspection.
2. Treasury payment clearance is **separate** from final permit approval.
3. Final approval/issuance requires `applications.approve` (admin only).
4. A permit cannot be issued unless all required workflow conditions are satisfied.
5. Rejections and returns-for-correction require a reason.
6. Status history is preserved; concurrent writes must not silently overwrite
   (optimistic checks on current status).

## Public tracking

Public tracking exposes only: Application ID, submission date, type, current status,
timeline entries marked `public_visible = 1`, outstanding requirements, and
applicant-safe remarks. It never exposes other applicants' PII or internal notes,
and requires the `track_pin` as a verification factor.

## Renewal

A renewal links to the existing `peddlers` record and `previous_permit_id`.
Prior applications, permits, inspections, payments, and violations are preserved
as history. No duplicate peddler profile is created on renewal.
