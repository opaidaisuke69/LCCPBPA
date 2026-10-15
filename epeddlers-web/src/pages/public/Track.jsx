import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Upload } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { Field, Spinner, StatusBadge, EmptyState } from '../../components/ui'
import { statusLabel } from '../../lib/status'
import { useToast } from '../../components/Toast'

export default function Track() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function lookup(e) {
    e?.preventDefault()
    if (!code.trim()) {
      toast.warning('Enter your Application ID.')
      return
    }
    setLoading(true)
    setData(null)
    try {
      const res = await api.get('/track', { params: { code: code.trim() } })
      setData(res.data.data)
    } catch (err) {
      toast.error(errorMessage(err, 'No matching application found.'))
    } finally {
      setLoading(false)
    }
  }

  // Auto-lookup if the code was provided (e.g. from Apply confirmation).
  // Deferred to a microtask so state updates don't run synchronously in the effect.
  useEffect(() => {
    if (params.get('code')) {
      Promise.resolve().then(() => lookup())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'requirement')
      await api.post(`/applications/${code.trim()}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Document uploaded.')
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed.'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const canUpload = data && ['draft', 'incomplete_requires_correction'].includes(data.status)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-darkgreen">Track Your Application</h1>
      <p className="mt-1 text-sm text-gray-500">
        Enter your Application ID to view the current status and timeline.
      </p>

      <form onSubmit={lookup} className="card mt-6 space-y-4 p-6">
        <Field label="Application ID">
          <input
            className="input font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="16-digit Application ID"
            inputMode="numeric"
          />
        </Field>
        <button className="btn-primary" disabled={loading}>
          {loading ? <Spinner /> : <Search size={16} />} Track
        </button>
      </form>

      {loading && (
        <div className="card mt-6 space-y-3 p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {!loading && data && (
        <div className="card mt-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="break-all font-mono text-sm text-gray-500">{data.application_code}</p>
              <p className="font-semibold text-darkgreen">
                {data.type === 'new' ? 'New Application' : 'Renewal'}
              </p>
            </div>
            <StatusBadge status={data.status} />
          </div>

          <h3 className="mt-6 text-sm font-semibold text-gray-700">Processing Timeline</h3>
          {data.timeline?.length ? (
            <ol className="mt-3 space-y-3">
              {data.timeline.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{statusLabel(t.to_status)}</p>
                    {t.remarks && <p className="text-sm text-gray-500">{t.remarks}</p>}
                    <p className="text-xs text-gray-400">
                      {t.department ? `${t.department} · ` : ''}
                      {new Date(t.created_at + 'Z').toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No public updates yet.</p>
          )}

          {canUpload && (
            <div className="mt-6 rounded-lg border border-dashed border-border-subtle p-4">
              <p className="text-sm font-medium text-gray-700">Upload a requirement document</p>
              <p className="text-xs text-gray-500">JPG, PNG, or PDF. Max 5MB.</p>
              <label className="btn-outline mt-3 cursor-pointer">
                {uploading ? <Spinner /> : <Upload size={16} />} Choose File
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
                  accept="image/jpeg,image/png,application/pdf" />
              </label>
            </div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div className="mt-6">
          <EmptyState title="No application loaded" hint="Enter your Application ID above to begin." />
        </div>
      )}
    </div>
  )
}
