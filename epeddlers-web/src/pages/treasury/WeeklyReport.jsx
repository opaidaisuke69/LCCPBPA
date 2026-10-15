import { useEffect, useState } from 'react'
import { Printer, Download, CalendarCheck } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { Spinner, EmptyState } from '../../components/ui'
import { useToast } from '../../components/Toast'

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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-darkgreen">Weekly Collection Report</h1>
          <p className="text-sm text-gray-500">
            Official reports can only be generated on Saturday (La Carlota time). Historical weeks are viewable anytime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" className="input w-auto" value={week} onChange={(e) => setWeek(e.target.value)} />
          <button className="btn-outline" onClick={() => load(week)}>View Week</button>
          <button className="btn-outline" onClick={exportCsv} disabled={!data?.rows?.length}>
            <Download size={16} /> CSV
          </button>
          <button className="btn-outline" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-primary" onClick={generate} disabled={generating || !data?.is_saturday_today}
            title={data?.is_saturday_today ? '' : 'Available only on Saturday'}>
            {generating ? <Spinner /> : <CalendarCheck size={16} />} Generate Official
          </button>
        </div>
      </div>

      {!data?.is_saturday_today && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
          Today is not the configured report day. You can view historical data, but official generation is disabled until Saturday.
        </p>
      )}

      {loading ? (
        <div className="mt-6 flex justify-center"><Spinner size={28} className="text-primary" /></div>
      ) : (
        <div className="card mt-4 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-darkgreen">La Carlota City — Weekly Collections</h2>
              <p className="text-sm text-gray-500">Week anchor: {data?.week} · Generated: {new Date((data?.generated_at || '') + 'Z').toLocaleString()}</p>
            </div>
          </div>

          {data?.rows?.length ? (
            <>
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Peddler</th>
                    <th className="px-3 py-2">Application</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Officer</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-xs">{new Date(r.collected_at + 'Z').toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.txn_ref}</td>
                      <td className="px-3 py-2">{r.peddler}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.application_code || '—'}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">{r.officer}</td>
                      <td className="px-3 py-2 capitalize">{r.status}</td>
                      <td className="px-3 py-2 text-right">{peso(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                <p>Successful: <span className="font-semibold">{peso(data.totals?.success)}</span></p>
                {Number(data.totals?.reversed) > 0 && <p className="text-red-600">Reversed: {peso(data.totals.reversed)}</p>}
                {Number(data.totals?.voided) > 0 && <p className="text-red-600">Voided: {peso(data.totals.voided)}</p>}
                {Number(data.totals?.pending) > 0 && <p className="text-amber-600">Pending: {peso(data.totals.pending)}</p>}
              </div>
            </>
          ) : (
            <EmptyState title="No collections for this week" hint="Totals reflect actual transactions only." />
          )}
        </div>
      )}
    </div>
  )
}
