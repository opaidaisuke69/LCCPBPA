import {
  Users, FileText, Clock, Search, ShieldCheck, Receipt, BadgeCheck, XCircle,
  AlertTriangle, Coins, TrendingUp, Activity,
} from 'lucide-react'
import { usePolling } from '../../lib/hooks'
import { PageHeader, StatCard, Panel, UpdatedPill, Skeleton, EmptyState } from '../../components/ui'

const CARDS = [
  { key: 'total_peddlers', label: 'Registered Peddlers', icon: Users, tone: 'primary' },
  { key: 'total_applications', label: 'Total Applications', icon: FileText, tone: 'blue' },
  { key: 'pending', label: 'Pending Review', icon: Clock, tone: 'amber' },
  { key: 'under_inspection', label: 'Under Inspection', icon: Search, tone: 'blue' },
  { key: 'awaiting_sanitary', label: 'Awaiting Sanitary', icon: ShieldCheck, tone: 'blue' },
  { key: 'awaiting_payment_verification', label: 'Awaiting Payment', icon: Receipt, tone: 'amber' },
  { key: 'approved_permits', label: 'Approved Permits', icon: BadgeCheck, tone: 'green' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, tone: 'red' },
  { key: 'needs_correction', label: 'Needs Correction', icon: AlertTriangle, tone: 'amber' },
  { key: 'violations', label: 'Violations', icon: AlertTriangle, tone: 'red' },
]

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function Dashboard() {
  const { data, loading, lastUpdated } = usePolling('/dashboard/admin', { interval: 3000 })
  const d = data?.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="System overview and recent activity across all departments."
        meta={<UpdatedPill at={lastUpdated} />}
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {CARDS.map((c) => (
          <StatCard
            key={c.key}
            label={c.label}
            icon={c.icon}
            tone={c.tone}
            loading={loading && !d}
            value={d?.[c.key] ?? 0}
          />
        ))}
      </div>

      {/* Collections summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-darkgreen to-deepgreen p-6 text-white shadow-sm sm:col-span-2">
          <div className="flex items-center gap-2 text-white/80">
            <Coins size={18} />
            <span className="text-sm font-medium">Total Collections (successful)</span>
          </div>
          {loading && !d ? (
            <Skeleton className="mt-3 h-9 w-40 bg-white/20" />
          ) : (
            <p className="mt-3 text-4xl font-bold tracking-tight">{peso(d?.collections_total)}</p>
          )}
          <p className="mt-1 text-sm text-white/60">{d?.collections_count ?? 0} transactions recorded</p>
        </div>
        <StatCard
          label="Paid Applications"
          icon={TrendingUp}
          tone="green"
          loading={loading && !d}
          value={d?.paid_applications ?? 0}
          hint="Applications with cleared payment"
        />
      </div>

      {/* Recent activity */}
      <Panel title="Recent System Activity" subtitle="Latest audited actions" bodyClassName="p-0">
        {loading && !d ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : d?.recent_activity?.length ? (
          <ul className="divide-y divide-border-subtle">
            {d.recent_activity.map((a, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Activity size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800">
                    {a.action}
                    {a.entity_type && (
                      <span className="font-normal text-gray-400"> · {a.entity_type} #{a.entity_id}</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {a.actor || 'system'} · {new Date(a.created_at + 'Z').toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Activity} title="No activity yet" hint="System actions will appear here as they happen." />
        )}
      </Panel>
    </div>
  )
}
