import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import api, { errorMessage } from '../../lib/api'
import { StatusBadge, Spinner, Field } from '../../components/ui'
import { useToast } from '../../components/Toast'

function peso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function PaymentDrawer({ code, onClose, onChanged }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/treasury/payments/${code}`)
      setData(res.data.data)
      const charges = res.data.data.charges || []
      const total = charges.reduce((s, c) => s + Number(c.amount), 0)
      setAmount(total > 0 ? String(total) : '')
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

  async function verify(result) {
    setBusy(true)
    try {
      await api.post(`/treasury/payments/${code}/verify`, {
        result,
        amount: amount ? Number(amount) : undefined,
        remarks,
      })
      toast.success(`Payment ${result}.`)
      setRemarks('')
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const app = data?.application
  const payments = data?.payments || []

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="font-semibold text-darkgreen">Payment Verification</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Spinner size={28} className="text-primary" /></div>
        ) : app ? (
          <div className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-gray-500">{app.application_code}</p>
                <p className="font-semibold text-darkgreen">{app.applicant_name}</p>
              </div>
              <StatusBadge status={app.status} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700">Charges</h3>
              {data.charges?.length ? (
                <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-subtle text-sm">
                  {data.charges.map((c) => (
                    <li key={c.id} className="flex justify-between px-3 py-2">
                      <span className="text-gray-600">{c.fee_name}</span>
                      <span className="font-medium">{peso(c.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-500">No charges recorded yet.</p>
              )}
            </div>

            {/* Verify form */}
            <div className="rounded-lg bg-surface-muted p-3">
              <h3 className="text-sm font-semibold text-gray-700">Verify Payment</h3>
              <div className="mt-2 space-y-2">
                <Field label="Amount">
                  <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="Remarks (e.g. OR number)">
                  <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
                <div className="flex gap-2 pt-1">
                  <button className="btn-primary" disabled={busy} onClick={() => verify('verified')}>
                    Mark Verified (Paid)
                  </button>
                  <button className="btn-outline border-amber-200 text-amber-700 hover:bg-amber-50" disabled={busy}
                    onClick={() => verify('rejected')}>
                    Mark Unpaid
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Verification clears payment for final approval but does not issue the permit.
                  Corrections are recorded as auditable reversing entries.
                </p>
              </div>
            </div>

            {/* History */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Payment Records</h3>
              {payments.length ? (
                <div className="mt-2 space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="rounded-lg border border-border-subtle p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-mono text-xs text-gray-500">{p.payment_ref}</span>
                        <span className="font-medium">{peso(p.amount)} · {p.status}</span>
                      </div>
                      {p.verifications?.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-border-subtle pt-2">
                          {p.verifications.map((v) => (
                            <li key={v.id} className="text-xs text-gray-500">
                              {v.result} by {v.verifier} · {new Date(v.created_at + 'Z').toLocaleString()}
                              {v.remarks ? ` — ${v.remarks}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">No payment records yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
