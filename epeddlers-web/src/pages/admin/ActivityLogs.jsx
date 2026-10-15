import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { Skeleton, EmptyState, Spinner } from '../../components/ui'

export default function ActivityLogs() {
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const debounced = useDebounced(action, 300)
  const params = useMemo(() => ({ action: debounced, from, to }), [debounced, from, to])
  const { items, total, loading, hasMore, loadMore } = useInfiniteList('/activity-logs', params)

  return (
    <div>
      <h1 className="text-2xl font-bold text-darkgreen">Activity Logs</h1>
      <p className="text-sm text-gray-500">Audit trail of important system actions. Read-only.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input className="input pl-9" placeholder="Filter by action..." value={action}
            onChange={(e) => setAction(e.target.value)} />
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">{total} entries</p>

      <div className="card mt-2 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No activity found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Entity</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{l.action}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {l.entity_type ? `${l.entity_type} #${l.entity_id}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{l.actor || 'system'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(l.created_at + 'Z').toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button className="btn-outline" onClick={loadMore} disabled={loading}>
            {loading ? <Spinner /> : null} Load more
          </button>
        </div>
      )}
    </div>
  )
}
