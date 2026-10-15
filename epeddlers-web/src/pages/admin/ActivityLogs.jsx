import { useMemo, useState } from 'react'
import { ScrollText, Activity } from 'lucide-react'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import {
  PageHeader, Skeleton, EmptyState, Spinner, Toolbar, SearchInput,
  TableWrap, TableHead, Th,
} from '../../components/ui'

export default function ActivityLogs() {
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const debounced = useDebounced(action, 300)
  const params = useMemo(() => ({ action: debounced, from, to }), [debounced, from, to])
  const { items, total, loading, hasMore, loadMore } = useInfiniteList('/activity-logs', params)

  return (
    <div className="space-y-5">
      <PageHeader title="Activity Logs" subtitle="Audit trail of important system actions. Read-only." />

      <Toolbar>
        <SearchInput value={action} onChange={setAction} placeholder="Filter by action…" />
        <div>
          <label className="label sr-only">From</label>
          <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <span className="text-sm text-gray-400">to</span>
        <div>
          <label className="label sr-only">To</label>
          <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <span className="ml-auto text-xs text-gray-400">{total} entr{total === 1 ? 'y' : 'ies'}</span>
      </Toolbar>

      {loading && items.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-border-subtle bg-white p-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-white">
          <EmptyState icon={ScrollText} title="No activity found" hint="Try widening your date range." />
        </div>
      ) : (
        <TableWrap>
          <TableHead>
            <Th>Action</Th>
            <Th>Entity</Th>
            <Th>Actor</Th>
            <Th>When</Th>
          </TableHead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((l) => (
              <tr key={l.id} className="transition hover:bg-surface-muted/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity size={14} />
                    </span>
                    <span className="font-medium text-gray-800">{l.action}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {l.entity_type ? (
                    <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs">
                      {l.entity_type} #{l.entity_id}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{l.actor || 'system'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(l.created_at + 'Z').toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button className="btn-outline" onClick={loadMore} disabled={loading}>
            {loading ? <Spinner /> : null} Load more
          </button>
        </div>
      )}
    </div>
  )
}
