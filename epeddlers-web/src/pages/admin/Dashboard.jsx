import {
  Users, FileText, Clock, Search, ShieldCheck, Receipt, BadgeCheck, XCircle, AlertTriangle, Coins,
} from 'lucide-react'
import { usePolling } from '../../lib/hooks'
import { Skeleton } from '../../components/ui'

const CARDS = [
  { key: 'total_peddlers', label: 'Registered Peddlers', icon: Users },
  { key: 'total_applications', label: 'Total Applications', icon: FileText },
  { key: 'pending', label: 'Pending Review', icon: Clock },
  { key: 'under_inspection', label: 'Under Inspection', icon: Search },
  { key: 'awaiting_sanitary', label: 'Awaiting Sanitary', icon: ShieldCheck },
  { key: 'awaiting_payment_verification', label: 'Awaiting Payment', icon: Receipt },
  { key: 'approved_permits', label: 'Approved Permits', icon: BadgeCheck },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'needs_correction', label: 'Needs Correction', icon: AlertTriangle },
  { key: 'violations', label: 'Violations', icon: AlertTriangle },
]

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function Dashboard() {
  const { data, loading, lastUpdated } = usePolling('/dashboard/admin', { interval: 3000 })
  const d = data?.data

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-darkgreen">Dashboard</h1>
          <p className="text-sm text-gray-500">System overview and recent activity.</p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {CARDS.map((c) => (
          <div key={c.key} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{c.label}</span>
              <c.icon size={16} className="text-primary" />
            </div>
            {loading && !d ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <p className="mt-2 text-2xl font-bold text-darkgreen">{d?.[c.key] ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      {/* Collections summary */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500">
            <Coins size={18} className="text-primary" />
            <span className="text-sm font-medium">Total Collections (successful)</span>
          </div>
          {loading && !d ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-darkgreen">{peso(d?.collections_total)}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">{d?.collections_count ?? 0} transactions</p>
        </div>
        <div className="card p-5">
          <span className="text-sm font-medium text-gray-500">Paid Applications</span>
          {loading && !d ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-darkgreen">{d?.paid_applications ?? 0}</p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card mt-4 p-5">
        <h2 className="text-sm font-semibold text-gray-700">Recent System Activity</h2>
        {loading && !d ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : d?.recent_activity?.length ? (
          <ul className="mt-3 divide-y divide-border-subtle">
            {d.recent_activity.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium text-gray-800">{a.action}</span>
                  {a.entity_type && <span className="text-gray-400"> · {a.entity_type} #{a.entity_id}</span>}
                </span>
                <span className="text-xs text-gray-400">
                  {a.actor || 'system'} · {new Date(a.created_at + 'Z').toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No activity yet.</p>
        )}
      </div>
    </div>
  )
}
