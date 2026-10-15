import { useEffect, useState } from 'react'
import { Download, Printer, BarChart3 } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import {
  PageHeader, Spinner, EmptyState, Panel, TableWrap, TableHead, Th,
} from '../../components/ui'
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

function prettyKey(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Totals and rows come from the database and respect your date range."
      />

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(REPORTS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setType(k)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                type === k ? 'bg-primary text-white shadow-sm' : 'bg-surface-muted text-gray-600 hover:text-darkgreen'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={load}>Apply</button>
          <button className="btn-outline" onClick={exportCsv} disabled={!data?.rows?.length}>
            <Download size={16} /> CSV
          </button>
          <button className="btn-outline" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {data?.summary && Object.keys(data.summary).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(data.summary).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{prettyKey(k)}</p>
              <p className="mt-1 text-xl font-bold text-darkgreen">
                {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center rounded-2xl border border-border-subtle bg-white py-12">
          <Spinner size={26} className="text-primary" />
        </div>
      ) : !data?.rows?.length ? (
        <div className="rounded-2xl border border-border-subtle bg-white">
          <EmptyState icon={BarChart3} title="No data for this report" hint="Adjust the date range and try again." />
        </div>
      ) : (
        <TableWrap>
          <TableHead>
            {def.columns.map(([, label]) => <Th key={label}>{label}</Th>)}
          </TableHead>
          <tbody className="divide-y divide-border-subtle">
            {data.rows.map((r, i) => (
              <tr key={i} className="transition hover:bg-surface-muted/60">
                {def.columns.map(([key]) => (
                  <td key={key} className="px-4 py-2.5 text-gray-700">
                    {key.endsWith('_at') && r[key] ? new Date(r[key] + 'Z').toLocaleString() : (r[key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  )
}
