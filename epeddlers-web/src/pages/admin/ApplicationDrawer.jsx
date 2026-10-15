import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { StatusBadge, Spinner } from '../../components/ui'
import { statusLabel } from '../../lib/status'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/auth'

export default function ApplicationDrawer({ code, onClose, onChanged }) {
  const toast = useToast()
  const { hasPermission } = useAuth()
  const [app, setApp] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [a, t] = await Promise.all([
        api.get(`/applications/${code}`),
        api.get(`/applications/${code}/timeline`),
      ])
      setApp(a.data.data)
      setTimeline(t.data.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function act(path, body, successMsg) {
    setBusy(true)
    try {
      await api.post(`/applications/${code}/${path}`, body)
      toast.success(successMsg)
      setReason('')
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const canReview = hasPermission('applications.review')
  const canApprove = hasPermission('applications.approve')
  const canReject = hasPermission('applications.reject')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="font-semibold text-darkgreen">Application Detail</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Spinner size={28} className="text-primary" /></div>
        ) : app ? (
          <div className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-gray-500">{app.application_code}</span>
              <StatusBadge status={app.status} />
            </div>

            <dl className="divide-y divide-border-subtle rounded-lg border border-border-subtle text-sm">
              {[
                ['Applicant', app.applicant_name],
                ['Type', app.type],
                ['Contact', app.contact_number || '—'],
                ['Email', app.email || '—'],
                ['Business', app.business_name || '—'],
                ['Goods', app.goods_type || '—'],
                ['Preferred Area', app.preferred_location || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3 py-2">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-right font-medium text-gray-800 capitalize">{v}</dd>
                </div>
              ))}
            </dl>

            {app.documents?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Documents</h3>
                <ul className="mt-2 space-y-1">
                  {app.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{d.original_name}</span>
                      <a
                        className="text-primary hover:underline"
                        href={`/api/v1/documents/${d.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="rounded-lg bg-surface-muted p-3">
              <h3 className="text-sm font-semibold text-gray-700">Actions</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {canReview && app.status === 'submitted' && (
                  <button className="btn-primary" disabled={busy}
                    onClick={() => act('review', {}, 'Forwarded for inspection.')}>
                    Accept & Forward to Inspection
                  </button>
                )}
                {canApprove && app.status === 'ready_for_final_approval' && (
                  <button className="btn-primary" disabled={busy}
                    onClick={() => act('approve', {}, 'Permit approved and issued.')}>
                    Approve & Issue Permit
                  </button>
                )}
              </div>

              {(canReject || canReview) && !['permit_issued', 'rejected', 'cancelled', 'expired'].includes(app.status) && (
                <div className="mt-3">
                  <input
                    className="input"
                    placeholder="Reason (for reject / return)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
                    {canReview && (
                      <button
                        className="btn-outline"
                        disabled={busy || !reason.trim()}
                        onClick={() => act('return-for-correction', { reason }, 'Returned for correction.')}
                      >
                        Return for Correction
                      </button>
                    )}
                    {canReject && (
                      <button
                        className="btn-outline border-red-200 text-red-600 hover:bg-red-50"
                        disabled={busy || !reason.trim()}
                        onClick={() => act('reject', { reason }, 'Application rejected.')}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Timeline</h3>
              <ol className="mt-2 space-y-3">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{statusLabel(t.to_status)}</p>
                      {t.remarks && <p className="text-sm text-gray-500">{t.remarks}</p>}
                      <p className="text-xs text-gray-400">
                        {t.changed_by_name || t.department || 'system'} · {new Date(t.created_at + 'Z').toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
