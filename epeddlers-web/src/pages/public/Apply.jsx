import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Copy } from 'lucide-react'
import api, { errorMessage, errorDetails } from '../../lib/api'
import { Field, Spinner } from '../../components/ui'
import { useToast } from '../../components/Toast'

const EMPTY = {
  type: 'new',
  applicant_name: '',
  contact_number: '',
  email: '',
  address: '',
  business_name: '',
  goods_type: '',
  activity_description: '',
  preferred_location: '',
  previous_permit_code: '',
}

export default function Apply() {
  const toast = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { application_code, track_pin }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function validateStep(n) {
    const e = {}
    if (n === 2) {
      if (!form.applicant_name.trim()) e.applicant_name = 'Required.'
      if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Invalid email.'
      if (form.type === 'renewal' && !form.previous_permit_code.trim())
        e.previous_permit_code = 'Existing Permit ID is required for renewal.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep(step)) setStep((s) => s + 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErrors({})
    try {
      // 1) create draft
      const created = await api.post('/applications', form)
      const { application_code, track_pin } = created.data.data
      // 2) submit
      await api.post(`/applications/${application_code}/submit`, { track_pin })
      setResult({ application_code, track_pin })
      toast.success('Application submitted successfully.')
      setStep(4)
    } catch (err) {
      const details = errorDetails(err)
      if (details) setErrors(details)
      toast.error(errorMessage(err, 'Could not submit the application.'))
    } finally {
      setSubmitting(false)
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text)
    toast.info('Copied to clipboard.')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-darkgreen">Apply for a Peddler Permit</h1>
      <p className="mt-1 text-sm text-gray-500">
        Complete the steps below. You'll receive an Application ID and PIN to track your status.
      </p>

      {/* Progress */}
      {step < 4 && (
        <div className="mt-6 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                  step >= n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {n}
              </span>
              {n < 3 && <div className={`h-0.5 flex-1 ${step > n ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      )}

      <div className="card mt-6 p-6">
        {/* Step 1 — type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-darkgreen">Application Type</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { v: 'new', t: 'New Application', d: 'First-time peddler permit.' },
                { v: 'renewal', t: 'Renewal', d: 'Existing peddler renewing a permit.' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: opt.v }))}
                  className={`rounded-lg border p-4 text-left transition ${
                    form.type === opt.v
                      ? 'border-primary bg-surface-muted ring-2 ring-primary/30'
                      : 'border-border-subtle hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold text-darkgreen">{opt.t}</p>
                  <p className="mt-1 text-sm text-gray-500">{opt.d}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={next}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — applicant + business */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-darkgreen">Applicant & Business Information</h2>
            {form.type === 'renewal' && (
              <Field label="Existing Permit ID" required error={errors.previous_permit_code}>
                <input className="input" value={form.previous_permit_code} onChange={set('previous_permit_code')} />
              </Field>
            )}
            <Field label="Full Name" required error={errors.applicant_name}>
              <input className="input" value={form.applicant_name} onChange={set('applicant_name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact Number" error={errors.contact_number}>
                <input className="input" value={form.contact_number} onChange={set('contact_number')} />
              </Field>
              <Field label="Email" error={errors.email}>
                <input className="input" value={form.email} onChange={set('email')} />
              </Field>
            </div>
            <Field label="Residential Address" error={errors.address}>
              <input className="input" value={form.address} onChange={set('address')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business / Vending Name" error={errors.business_name}>
                <input className="input" value={form.business_name} onChange={set('business_name')} />
              </Field>
              <Field label="Type of Goods Sold" error={errors.goods_type}>
                <input className="input" value={form.goods_type} onChange={set('goods_type')} />
              </Field>
            </div>
            <Field label="Preferred Vending Area (description)" error={errors.preferred_location}>
              <input className="input" value={form.preferred_location} onChange={set('preferred_location')} />
            </Field>
            <div className="flex justify-between">
              <button className="btn-outline" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn-primary" onClick={next}>
                Review <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-darkgreen">Review & Submit</h2>
            <dl className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {[
                ['Type', form.type === 'new' ? 'New Application' : 'Renewal'],
                form.type === 'renewal' && ['Existing Permit ID', form.previous_permit_code],
                ['Full Name', form.applicant_name],
                ['Contact', form.contact_number || '—'],
                ['Email', form.email || '—'],
                ['Address', form.address || '—'],
                ['Business', form.business_name || '—'],
                ['Goods', form.goods_type || '—'],
                ['Preferred Area', form.preferred_location || '—'],
              ]
                .filter(Boolean)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-right font-medium text-gray-800">{v}</dd>
                  </div>
                ))}
            </dl>
            <p className="text-xs text-gray-500">
              You can upload required documents after submission from the tracking page.
            </p>
            <div className="flex justify-between">
              <button className="btn-outline" onClick={() => setStep(2)} disabled={submitting}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Spinner /> : <CheckCircle2 size={16} />} Submit Application
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — confirmation */}
        {step === 4 && result && (
          <div className="space-y-4 text-center">
            <CheckCircle2 size={48} className="mx-auto text-primary" />
            <h2 className="text-xl font-bold text-darkgreen">Application Submitted</h2>
            <p className="text-sm text-gray-600">
              Save your Application ID and PIN. You'll need both to track your application.
            </p>
            <div className="mx-auto max-w-sm space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-muted px-4 py-3">
                <div className="text-left">
                  <p className="text-xs text-gray-500">Application ID</p>
                  <p className="font-mono font-semibold text-darkgreen">{result.application_code}</p>
                </div>
                <button className="btn-outline px-2 py-1" onClick={() => copy(result.application_code)}>
                  <Copy size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-muted px-4 py-3">
                <div className="text-left">
                  <p className="text-xs text-gray-500">Tracking PIN</p>
                  <p className="font-mono font-semibold text-darkgreen">{result.track_pin}</p>
                </div>
                <button className="btn-outline px-2 py-1" onClick={() => copy(result.track_pin)}>
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                className="btn-primary"
                onClick={() => navigate(`/track?code=${result.application_code}&pin=${result.track_pin}`)}
              >
                Track Now
              </button>
              <button className="btn-outline" onClick={() => { setForm(EMPTY); setResult(null); setStep(1) }}>
                New Application
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
