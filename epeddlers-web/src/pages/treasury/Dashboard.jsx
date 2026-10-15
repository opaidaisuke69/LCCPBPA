import { Users, CheckCircle2, Clock, Coins, CalendarDays } from 'lucide-react'
import { usePolling } from '../../lib/hooks'
import { Skeleton } from '../../components/ui'

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function TreasuryDashboard() {
  const { data, loading, lastUpdated } = usePolling('/treasury/dashboard', { interval: 3000 })
  const d = data?.data

  const cards = [
    { label: 'Total Applicants', value: d?.total_applicants, icon: Users },
    { label: 'Paid Applications', value: d?.paid_applications, icon: CheckCircle2 },
    { label: 'Unpaid', value: d?.unpaid_applications, icon: Clock },
    { label: 'Awaiting Verification', value: d?.awaiting_verification, icon: Clock },
  ]

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-darkgreen">Treasury Dashboard</h1>
          <p className="text-sm text-gray-500">Payment verification and collection overview.</p>
        </div>
        {lastUpdated && <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{c.label}</span>
              <c.icon size={16} className="text-primary" />
            </div>
            {loading && !d ? <Skeleton className="mt-2 h-7 w-12" /> : (
              <p className="mt-2 text-2xl font-bold text-darkgreen">{c.value ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500">
            <Coins size={18} className="text-primary" />
            <span className="text-sm font-medium">Total Collections</span>
          </div>
          {loading && !d ? <Skeleton className="mt-2 h-8 w-32" /> : (
            <p className="mt-2 text-3xl font-bold text-darkgreen">{peso(d?.total_collections)}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">{d?.total_collection_count ?? 0} transactions</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500">
            <CalendarDays size={18} className="text-primary" />
            <span className="text-sm font-medium">This Week (anchor {d?.saturday_week || '—'})</span>
          </div>
          {loading && !d ? <Skeleton className="mt-2 h-8 w-32" /> : (
            <p className="mt-2 text-3xl font-bold text-darkgreen">{peso(d?.saturday_total)}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">{d?.saturday_count ?? 0} transactions this week</p>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="text-sm font-semibold text-gray-700">Recent Collections</h2>
        {loading && !d ? (
          <div className="mt-3 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : d?.recent_collections?.length ? (
          <ul className="mt-3 divide-y divide-border-subtle">
            {d.recent_collections.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-mono text-xs text-gray-500">{c.txn_ref}</span>
                  <span className="ml-2 font-medium text-gray-800">{c.peddler}</span>
                </span>
                <span className="text-gray-700">{peso(c.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No collections yet.</p>
        )}
      </div>
    </div>
  )
}
