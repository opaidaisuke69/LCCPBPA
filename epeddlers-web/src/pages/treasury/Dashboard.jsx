import { Users, CheckCircle2, Clock, Coins, CalendarDays, Receipt } from 'lucide-react'
import { usePolling } from '../../lib/hooks'
import { PageHeader, StatCard, Panel, UpdatedPill, Skeleton, EmptyState } from '../../components/ui'

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function TreasuryDashboard() {
  const { data, loading, lastUpdated } = usePolling('/treasury/dashboard', { interval: 3000 })
  const d = data?.data

  const cards = [
    { label: 'Total Applicants', value: d?.total_applicants, icon: Users, tone: 'primary' },
    { label: 'Paid Applications', value: d?.paid_applications, icon: CheckCircle2, tone: 'green' },
    { label: 'Unpaid', value: d?.unpaid_applications, icon: Clock, tone: 'amber' },
    { label: 'Awaiting Verification', value: d?.awaiting_verification, icon: Receipt, tone: 'blue' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treasury Dashboard"
        subtitle="Payment verification and collection overview."
        meta={<UpdatedPill at={lastUpdated} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            icon={c.icon}
            tone={c.tone}
            loading={loading && !d}
            value={c.value ?? 0}
          />
        ))}
      </div>

      {/* Collection hero cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-darkgreen to-deepgreen p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 text-white/80">
            <Coins size={18} />
            <span className="text-sm font-medium">Total Collections</span>
          </div>
          {loading && !d ? (
            <Skeleton className="mt-3 h-9 w-40 bg-white/20" />
          ) : (
            <p className="mt-3 text-4xl font-bold tracking-tight">{peso(d?.total_collections)}</p>
          )}
          <p className="mt-1 text-sm text-white/60">{d?.total_collection_count ?? 0} transactions</p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays size={18} />
            </span>
            <span className="text-sm font-medium">This Week · anchor {d?.saturday_week || '—'}</span>
          </div>
          {loading && !d ? (
            <Skeleton className="mt-3 h-9 w-32" />
          ) : (
            <p className="mt-3 text-4xl font-bold tracking-tight text-darkgreen">{peso(d?.saturday_total)}</p>
          )}
          <p className="mt-1 text-sm text-gray-400">{d?.saturday_count ?? 0} transactions this week</p>
        </div>
      </div>

      {/* Recent collections */}
      <Panel title="Recent Collections" subtitle="Most recent arkabala transactions" bodyClassName="p-0">
        {loading && !d ? (
          <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : d?.recent_collections?.length ? (
          <ul className="divide-y divide-border-subtle">
            {d.recent_collections.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Coins size={15} />
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{c.peddler}</p>
                    <p className="font-mono text-xs text-gray-400">{c.txn_ref}</p>
                  </div>
                </div>
                <span className="font-semibold text-darkgreen">{peso(c.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Coins} title="No collections yet" hint="Recorded collections will appear here." />
        )}
      </Panel>
    </div>
  )
}
