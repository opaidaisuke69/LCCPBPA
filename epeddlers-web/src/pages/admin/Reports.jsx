import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { Spinner, EmptyState } from '../../components/ui'
import { useToast } from '../../components/Toast'

const REPORTS = {
  applications: {
    label: 'Applications',
    columns: [
      ['application_code', 'Application ID'],
      ['type', 'Type'],
      ['status', 'Status'],
      ['applicant_name', 'Applicant'],
      ['business_name', 'Business'],
      ['created_at', 'Created'],
    ],
  },
  collections: {
    label: 'Collections',
    columns: [
      ['txn_ref', 'Reference'],
      ['peddler', 'Peddler'],
      ['category', 'Category'],
      ['amount', 'Amount'],
      ['status', 'Status'],
      ['collected_at', 'Collected'],
    ],
  },
  inspections: {
    label: 'Inspections',
    columns: [
      ['application_code', 'Application ID'],
      ['applicant_name', 'Applicant'],
      ['compliance', 'Compliance'],
      ['recommendation', 'Recommendation'],
      ['officer', 'Officer'],
      ['inspected_at', 'Date'],
    ],
  },
  violations: {
    label: 'Violations',
    columns: [
      ['category', 'Category'],
      ['peddler', 'Peddler'],
      ['violation_date', 'Date'],
      ['resolution_status', 'Resolution'],
      ['penalty_amount', 'Penalty'],
      ['recorder', 'Recorded by'],
    ],
  },
}

function csvCell(value) {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = "'" + s
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

export default function Reports() {
  const toast = useToast()
  const [type, setType] = useState('applications')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/reports/${type}`, { params: { from, to } })
      setData(res.data.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const def = REPORTS[type]

  function exportCsv() {
    if (!data?.rows?.length) return
    const header = def.columns.map(([, label]) => label)
    const lines = [header.map(csvCell).join(',')]
    data.rows.forEach((r) => {
      lines.push(def.columns.map(([key]) => csvCell(r[key])).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-darkgreen">Reports</h1>
      <p className="text-sm text-gray-500">Totals and rows come from the database and respect your date range.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="label">Report</label>
          <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(REPORTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-outline" onClick={load}>Apply</button>
        <button className="btn-outline" onClick={exportCsv} disabled={!data?.rows?.length}>
          <Download size={16} /> CSV
        </button>
        <button className="btn-outline" onClick={() => window.print()}>
          <Printer size={16} /> Print
        </button>
      </div>

      {data?.summary && (
        <div className="card mt-4 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Summary</h2>
          <pre className="mt-2 overflow-x-auto text-xs text-gray-600">{JSON.stringify(data.summary, null, 2)}</pre>
        </div>
      )}

      <div className="card mt-4 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-8"><Spinner size={24} className="text-primary" /></div>
        ) : !data?.rows?.length ? (
          <EmptyState title="No data for this report" hint="Adjust the date range and try again." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase text-gray-500">
              <tr>{def.columns.map(([, label]) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data.rows.map((r, i) => (
                <tr key={i}>
                  {def.columns.map(([key]) => (
                    <td key={key} className="px-3 py-2 text-gray-700">
                      {key.endsWith('_at') && r[key] ? new Date(r[key] + 'Z').toLocaleString() : (r[key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
