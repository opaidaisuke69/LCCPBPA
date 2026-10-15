import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import {
  PageHeader, StatusBadge, Skeleton, EmptyState, Spinner, Toolbar, SearchInput,
  Segmented, Avatar, TableWrap, TableHead, Th,
} from '../../components/ui'
import PaymentDrawer from './PaymentDrawer'

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function Applicants() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [selected, setSelected] = useState(null)
  const debounced = useDebounced(search, 300)
  const params = useMemo(() => ({ search: debounced, type }), [debounced, type])
  const { items, total, loading, hasMore, loadMore, refresh } = useInfiniteList('/treasury/applicants', params)

  return (
    <div className="space-y-5">
      <PageHeader title="Applicants & Payments" subtitle="Find an application and verify its payment status." />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by Application ID or name…" />
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: '', label: 'All' },
            { value: 'new', label: 'New' },
            { value: 'renewal', label: 'Renewal' },
          ]}
        />
        <span className="ml-auto text-xs text-gray-400">{total} applicant{total === 1 ? '' : 's'}</span>
      </Toolbar>

      {loading && items.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-border-subtle bg-white p-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-white">
          <EmptyState icon={Receipt} title="No applicants found" hint="Adjust your search or type filter." />
        </div>
      ) : (
        <TableWrap>
          <TableHead>
            <Th>Application</Th>
            <Th>Applicant</Th>
            <Th>Status</Th>
            <Th>Charges</Th>
            <Th>Payment</Th>
          </TableHead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelected(a.application_code)}
                className="cursor-pointer transition hover:bg-surface-muted/60"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.application_code}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.applicant_name} size={32} />
                    <span className="font-medium text-gray-800">{a.applicant_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3 font-medium text-gray-700">{peso(a.total_charges)}</td>
                <td className="px-4 py-3">
                  {Number(a.verified_payments) > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unpaid
                    </span>
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

      {selected && (
        <PaymentDrawer code={selected} onClose={() => setSelected(null)} onChanged={refresh} />
      )}
    </div>
  )
}
