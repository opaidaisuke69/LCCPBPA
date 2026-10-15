import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { StatusBadge, Skeleton, EmptyState, Spinner } from '../../components/ui'
import PaymentDrawer from './PaymentDrawer'

export default function Applicants() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [selected, setSelected] = useState(null)
  const debounced = useDebounced(search, 300)
  const params = useMemo(() => ({ search: debounced, type }), [debounced, type])
  const { items, total, loading, hasMore, loadMore, refresh } = useInfiniteList('/treasury/applicants', params)

  return (
    <div>
      <h1 className="text-2xl font-bold text-darkgreen">Applicants & Payments</h1>
      <p className="text-sm text-gray-500">Find an application and verify its payment status.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input className="input pl-9" placeholder="Search by Application ID or name..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="new">New</option>
          <option value="renewal">Renewal</option>
        </select>
      </div>
      <p className="mt-3 text-xs text-gray-400">{total} applicant(s)</p>

      <div className="card mt-2 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No applicants found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Application ID</th>
                <th className="px-4 py-2.5">Applicant</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Charges</th>
                <th className="px-4 py-2.5">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((a) => (
                <tr key={a.id} onClick={() => setSelected(a.application_code)} className="cursor-pointer hover:bg-surface-muted">
                  <td className="px-4 py-2.5 font-mono text-xs">{a.application_code}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{a.applicant_name}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-2.5">₱{Number(a.total_charges).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2.5">
                    {Number(a.verified_payments) > 0
                      ? <span className="badge bg-green-100 text-green-800">Paid</span>
                      : <span className="badge bg-amber-100 text-amber-800">Unpaid</span>}
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
        <PaymentDrawer code={selected} onClose={() => setSelected(null)} onChanged={refresh} />
      )}
    </div>
  )
}
