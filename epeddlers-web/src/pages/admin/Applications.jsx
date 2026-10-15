import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { StatusBadge, Skeleton, EmptyState, Spinner } from '../../components/ui'
import ApplicationDrawer from './ApplicationDrawer'

const STATUS_FILTERS = [
  '', 'submitted', 'pending_inspection', 'pending_sanitary_review',
  'awaiting_payment', 'ready_for_final_approval', 'permit_issued', 'rejected',
]

export default function Applications() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [selected, setSelected] = useState(null)

  const debouncedSearch = useDebounced(search, 300)
  const params = useMemo(
    () => ({ search: debouncedSearch, status, type }),
    [debouncedSearch, status, type],
  )
  const { items, total, loading, hasMore, loadMore, refresh } = useInfiniteList('/applications', params)

  return (
    <div>
      <h1 className="text-2xl font-bold text-darkgreen">Applications</h1>
      <p className="text-sm text-gray-500">Monitor applications and act on each stage.</p>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by Application ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_FILTERS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="new">New</option>
          <option value="renewal">Renewal</option>
        </select>
      </div>

      <p className="mt-3 text-xs text-gray-400">{total} result(s)</p>

      {/* List */}
      <div className="card mt-2 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No applications found" hint="Try adjusting your filters." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Application ID</th>
                <th className="px-4 py-2.5">Applicant</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a.application_code)}
                  className="cursor-pointer hover:bg-surface-muted"
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{a.application_code}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{a.applicant_name}</td>
                  <td className="px-4 py-2.5 capitalize">{a.type}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {a.submitted_at ? new Date(a.submitted_at + 'Z').toLocaleDateString() : '—'}
                  </td>
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

      {selected && (
        <ApplicationDrawer
          code={selected}
          onClose={() => setSelected(null)}
          onChanged={() => { refresh() }}
        />
      )}
    </div>
  )
}
