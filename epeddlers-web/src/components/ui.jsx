import { Loader2 } from 'lucide-react'
import { statusClasses, statusLabel } from '../lib/status'

export function Spinner({ size = 18, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

export function StatusBadge({ status }) {
  return <span className={`badge ${statusClasses(status)}`}>{statusLabel(status)}</span>
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

export function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-white py-12 text-center">
      <p className="font-medium text-gray-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  )
}

export function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
