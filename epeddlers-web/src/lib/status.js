// Human labels + badge colors for application statuses.
export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_initial_review: 'Under Initial Review',
  incomplete_requires_correction: 'Needs Correction',
  pending_inspection: 'Pending Inspection',
  inspection_approved: 'Inspection Approved',
  inspection_rejected: 'Inspection Rejected',
  pending_sanitary_review: 'Pending Sanitary Review',
  sanitary_approved: 'Sanitary Approved',
  sanitary_rejected: 'Sanitary Rejected',
  awaiting_payment: 'Awaiting Payment',
  payment_verification_pending: 'Payment Verification Pending',
  payment_cleared: 'Payment Cleared',
  ready_for_final_approval: 'Ready for Final Approval',
  approved: 'Approved',
  permit_issued: 'Permit Issued',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

export function statusClasses(status) {
  if (['approved', 'permit_issued', 'inspection_approved', 'sanitary_approved', 'payment_cleared'].includes(status))
    return 'bg-green-100 text-green-800'
  if (['rejected', 'inspection_rejected', 'sanitary_rejected', 'cancelled', 'expired'].includes(status))
    return 'bg-red-100 text-red-700'
  if (['incomplete_requires_correction'].includes(status))
    return 'bg-amber-100 text-amber-800'
  return 'bg-blue-100 text-blue-700'
}
