import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import {
  PageHeader, StatusBadge, Skeleton, EmptyState, Spinner, Toolbar, SearchInput,
  Segmented, Avatar, TableWrap, TableHead, Th,
} from '../../components/ui'
import ApplicationDrawer from './ApplicationDrawer'

const STATUS_FILTERS = [
  'submitted', 'pending_inspection', 'pending_sanitary_review',
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
    <div className="space-y-5">
      <PageHeader title="Applications" subtitle="Monitor applications and act on each processing stage." />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by Application ID or name…" />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: '', label: 'All' },
            { value: 'new', label: 'New' },
            { value: 'renewal', label: 'Renewal' },
          ]}
        />
        <span className="ml-auto text-xs text-gray-400">{total} result{total === 1 ? '' : 's'}</span>
      </Toolbar>

      {loading && items.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-border-subtle bg-white p-4">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-white">
          <EmptyState icon={FileText} title="No applications found" hint="Try adjusting your search or filters." />
        </div>
      ) : (
        <TableWrap>
          <TableHead>
            <Th>Application</Th>
            <Th>Applicant</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Submitted</Th>
          </TableHead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelected(a.application_code)}
                className="cursor-pointer transition hover:bg-surface-muted/60"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-500">{a.application_code}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.applicant_name} size={32} />
                    <span className="font-medium text-gray-800">{a.applicant_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                    {a.type}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {a.submitted_at ? new Date(a.submitted_at + 'Z').toLocaleDateString() : '—'}
                </td>
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
