import { useEffect, useState } from 'react'
import { Printer, Download, CalendarCheck } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { PageHeader, Spinner, EmptyState, TableWrap, TableHead, Th } from '../../components/ui'
import { useToast } from '../../components/Toast'
import logo from '../../assets/logo.png'

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

// Guard against CSV formula injection.
function csvCell(value) {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = "'" + s
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

export default function WeeklyReport() {
  const toast = useToast()
  const [week, setWeek] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  async function load(w) {
    setLoading(true)
    try {
      const res = await api.get('/treasury/reports/weekly', { params: w ? { week: w } : {} })
      setData(res.data.data)
      if (!w) setWeek(res.data.data.week)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generate() {
    setGenerating(true)
    try {
      const res = await api.post('/treasury/reports/weekly/generate', {})
      setData(res.data.data)
      toast.success('Official weekly report generated.')
    } catch (err) {
      toast.error(errorMessage(err, 'Report generation failed.'))
    } finally {
      setGenerating(false)
    }
  }

  function exportCsv() {
    if (!data?.rows?.length) return
    const header = ['Collected At', 'Reference', 'Peddler', 'Application', 'Amount', 'Category', 'Officer', 'Status']
    const lines = [header.map(csvCell).join(',')]
    data.rows.forEach((r) => {
      lines.push([
        r.collected_at, r.txn_ref, r.peddler, r.application_code || '',
        r.amount, r.category, r.officer, r.status,
      ].map(csvCell).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-collections-${data.week}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <PageHeader
          title="Weekly Collection Report"
          subtitle="Official reports can only be generated on Saturday (La Carlota time). Historical weeks are viewable anytime."
          actions={
            <button
              className="btn-primary"
              onClick={generate}
              disabled={generating || !data?.is_saturday_today}
              title={data?.is_saturday_today ? '' : 'Available only on Saturday'}
            >
              {generating ? <Spinner /> : <CalendarCheck size={16} />} Generate Official
            </button>
          }
        />

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
          <div>
            <label className="label">Week anchor</label>
            <input type="date" className="input w-auto" value={week} onChange={(e) => setWeek(e.target.value)} />
          </div>
          <button className="btn-outline" onClick={() => load(week)}>View Week</button>
          <div className="ml-auto flex gap-2">
            <button className="btn-outline" onClick={exportCsv} disabled={!data?.rows?.length}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-outline" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {!data?.is_saturday_today && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            Today is not the configured report day. You can view historical data, but official generation is disabled until Saturday.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-border-subtle bg-white py-12">
          <Spinner size={28} className="text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm">
          {/* Official letterhead */}
          <div className="flex items-center gap-4 border-b border-border-subtle bg-surface-muted/50 px-6 py-5">
            <img src={logo} alt="City of La Carlota Official Seal" className="h-14 w-14 shrink-0 object-contain" />
            <div>
              <h2 className="text-lg font-bold text-darkgreen">La Carlota City — Weekly Collections</h2>
              <p className="text-sm text-gray-500">
                Week anchor: {data?.week} · Generated: {data?.generated_at ? new Date(data.generated_at + 'Z').toLocaleString() : '—'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {data?.rows?.length ? (
              <>
                <TableWrap>
                  <TableHead>
                    <Th>Date</Th>
                    <Th>Reference</Th>
                    <Th>Peddler</Th>
                    <Th>Application</Th>
                    <Th>Category</Th>
                    <Th>Officer</Th>
                    <Th>Status</Th>
                    <Th right>Amount</Th>
                  </TableHead>
                  <tbody className="divide-y divide-border-subtle">
                    {data.rows.map((r, i) => (
                      <tr key={i} className="transition hover:bg-surface-muted/60">
                        <td className="px-4 py-2.5 text-xs">{new Date(r.collected_at + 'Z').toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.txn_ref}</td>
                        <td className="px-4 py-2.5">{r.peddler}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.application_code || '—'}</td>
                        <td className="px-4 py-2.5">{r.category}</td>
                        <td className="px-4 py-2.5">{r.officer}</td>
                        <td className="px-4 py-2.5 capitalize">{r.status}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{peso(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>

                {/* Totals */}
                <div className="mt-5 flex justify-end">
                  <div className="w-full max-w-xs space-y-1.5 rounded-xl border border-border-subtle bg-surface-muted/50 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Successful</span>
                      <span className="font-bold text-darkgreen">{peso(data.totals?.success)}</span>
                    </div>
                    {Number(data.totals?.reversed) > 0 && (
                      <div className="flex items-center justify-between text-red-600">
                        <span>Reversed</span><span>{peso(data.totals.reversed)}</span>
                      </div>
                    )}
                    {Number(data.totals?.voided) > 0 && (
                      <div className="flex items-center justify-between text-red-600">
                        <span>Voided</span><span>{peso(data.totals.voided)}</span>
                      </div>
                    )}
                    {Number(data.totals?.pending) > 0 && (
                      <div className="flex items-center justify-between text-amber-600">
                        <span>Pending</span><span>{peso(data.totals.pending)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={CalendarCheck} title="No collections for this week" hint="Totals reflect actual transactions only." />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
