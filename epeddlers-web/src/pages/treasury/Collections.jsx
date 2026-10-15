import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { Skeleton, EmptyState, Spinner } from '../../components/ui'
import { useToast } from '../../components/Toast'

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}
function toneFor(status) {
  if (status === 'success') return 'bg-green-100 text-green-800'
  if (status === 'reversed' || status === 'voided') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-800'
}

export default function Collections() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [week, setWeek] = useState('')
  const [confirm, setConfirm] = useState(null) // transaction being reversed
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const debounced = useDebounced(search, 300)
  const params = useMemo(() => ({ search: debounced, status, week }), [debounced, status, week])
  const { items, total, loading, hasMore, loadMore, refresh } = useInfiniteList('/treasury/collections', params)

  async function doReverse() {
    setBusy(true)
    try {
      await api.post(`/treasury/collections/${confirm.id}/reverse`, { reason })
      toast.success('Transaction reversed.')
      setConfirm(null)
      setReason('')
      refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-darkgreen">Collection Records</h1>
      <p className="text-sm text-gray-500">Review and reconcile arkabala collections.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input className="input pl-9" placeholder="Search by reference or peddler..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="reversed">Reversed</option>
          <option value="voided">Voided</option>
          <option value="pending">Pending</option>
        </select>
        <div>
          <label className="label">Week</label>
          <input type="date" className="input w-auto" value={week} onChange={(e) => setWeek(e.target.value)} />
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">{total} transaction(s)</p>

      <div className="card mt-2 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No collections found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Reference</th>
                <th className="px-4 py-2.5">Peddler</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-2.5 font-mono text-xs">{c.txn_ref}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{c.peddler_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.fee_name}</td>
                  <td className="px-4 py-2.5">{peso(c.amount)}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${toneFor(c.status)}`}>{c.status}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    {c.status === 'success' && (
                      <button className="btn-outline px-2 py-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setConfirm(c)}>
                        Reverse
                      </button>
                    )}
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

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setConfirm(null)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-darkgreen">Reverse Transaction</h2>
            <p className="mt-1 text-sm text-gray-500">
              {confirm.txn_ref} · {peso(confirm.amount)}. This is auditable and cannot be undone.
            </p>
            <input className="input mt-3" placeholder="Reason (required)" value={reason}
              onChange={(e) => setReason(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
              <button className="btn-primary bg-red-600 hover:bg-red-700" disabled={busy || !reason.trim()} onClick={doReverse}>
                {busy ? <Spinner /> : null} Reverse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
