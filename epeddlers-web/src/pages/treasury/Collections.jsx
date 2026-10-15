import { useMemo, useState } from 'react'
import { Coins, X } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import {
  PageHeader, Skeleton, EmptyState, Spinner, Toolbar, SearchInput,
  Avatar, TableWrap, TableHead, Th,
} from '../../components/ui'
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
    <div className="space-y-5">
      <PageHeader title="Collection Records" subtitle="Review and reconcile arkabala collections." />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by reference or peddler…" />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="reversed">Reversed</option>
          <option value="voided">Voided</option>
          <option value="pending">Pending</option>
        </select>
        <div>
          <label className="label sr-only">Week</label>
          <input type="date" className="input w-auto" value={week} onChange={(e) => setWeek(e.target.value)} />
        </div>
        <span className="ml-auto text-xs text-gray-400">{total} transaction{total === 1 ? '' : 's'}</span>
      </Toolbar>

      {loading && items.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-border-subtle bg-white p-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-white">
          <EmptyState icon={Coins} title="No collections found" hint="Adjust your filters to see transactions." />
        </div>
      ) : (
        <TableWrap>
          <TableHead>
            <Th>Reference</Th>
            <Th>Peddler</Th>
            <Th>Category</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th right>Action</Th>
          </TableHead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((c) => (
              <tr key={c.id} className="transition hover:bg-surface-muted/60">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.txn_ref}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.peddler_name} size={30} />
                    <span className="font-medium text-gray-800">{c.peddler_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.fee_name}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{peso(c.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${toneFor(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {c.status === 'success' && (
                    <button
                      className="btn-outline border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      onClick={() => setConfirm(c)}
                    >
                      Reverse
                    </button>
                  )}
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

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <h2 className="text-base font-semibold text-red-600">Reverse Transaction</h2>
              <button onClick={() => setConfirm(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-muted">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600">
                <span className="font-mono text-xs">{confirm.txn_ref}</span> · {peso(confirm.amount)}
              </p>
              <p className="mt-1 text-xs text-gray-400">This action is auditable and cannot be undone.</p>
              <input
                className="input mt-3"
                placeholder="Reason (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button className="btn-outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
                <button
                  className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  disabled={busy || !reason.trim()}
                  onClick={doReverse}
                >
                  {busy ? <Spinner /> : null} Reverse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
