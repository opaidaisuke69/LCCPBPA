import { Loader2, Search } from 'lucide-react'
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

export function EmptyState({ title, hint, icon: Icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-gray-400">
          <Icon size={22} />
        </span>
      )}
      <p className="font-semibold text-darkgreen">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
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

/* ---------------------------------------------------------------------------
 * Workspace page primitives — shared across Admin & Treasury
 * ------------------------------------------------------------------------- */

/** Page header with title, optional subtitle, and right-aligned actions. */
export function PageHeader({ title, subtitle, actions, meta }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-darkgreen md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {meta}
        {actions}
      </div>
    </div>
  )
}

/** A soft "updated at" pill for polling screens. */
export function UpdatedPill({ at }) {
  if (!at) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-gray-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      Updated {at.toLocaleTimeString()}
    </span>
  )
}

const TONES = {
  primary: 'bg-primary/10 text-primary',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-700',
  slate: 'bg-surface-muted text-gray-500',
}

/** Metric card: icon chip + label + value, with loading state. */
export function StatCard({ label, value, icon: Icon, tone = 'primary', hint, loading }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone] || TONES.primary}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-3 text-3xl font-bold tracking-tight text-darkgreen">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

/** A titled surface panel. */
export function Panel({ title, subtitle, actions, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold text-darkgreen">{title}</h2>}
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClassName || 'p-5'}>{children}</div>
    </section>
  )
}

/** Toolbar row for filters/search above a table. */
export function Toolbar({ children }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2.5">{children}</div>
}

/** Search input with leading icon. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative min-w-[220px] flex-1 ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className="input pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Segmented control for small enum filters (e.g. type: all/new/renewal). */
export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border border-border-subtle bg-white p-0.5">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-darkgreen'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Round initials avatar derived from a name. */
export function Avatar({ name = '', tone = 'primary', size = 36 }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-xs font-bold ${TONES[tone] || TONES.primary}`}
      style={{ width: size, height: size }}
    >
      {initials || '?'}
    </span>
  )
}

/** Thin wrapper giving a table consistent chrome + horizontal scroll. */
export function TableWrap({ children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-white shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, right }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

export function TableHead({ children }) {
  return (
    <thead className="border-b border-border-subtle bg-surface-muted/60">
      <tr>{children}</tr>
    </thead>
  )
}
