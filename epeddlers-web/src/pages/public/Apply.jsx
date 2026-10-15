import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Upload, X, IdCard, Check } from 'lucide-react'
import api, { errorMessage, errorDetails } from '../../lib/api'
import { Field, Spinner } from '../../components/ui'
import { useToast } from '../../components/Toast'
import logo from '../../assets/logo.png'

const VALID_IDS = [
  'Philippine Passport',
  "Driver's License",
  'UMID / SSS ID',
  'PhilSys / National ID',
  'PhilHealth ID',
  "Voter's ID / Certificate",
  'Postal ID',
  'PRC ID',
  'Senior Citizen ID',
  'Barangay ID / Certificate',
]

const STEPS = [
  { n: 1, label: 'Application Type', hint: 'New or renewal' },
  { n: 2, label: 'Applicant Details', hint: 'Personal & business info' },
  { n: 3, label: 'Valid ID', hint: 'Front & back photos' },
  { n: 4, label: 'Review & Submit', hint: 'Confirm your entries' },
]

const EMPTY = {
  type: 'new',
  // Basic information
  sex: '',
  date_of_birth: '',
  civil_status: '',
  ctc_no: '',
  application_date: new Date().toISOString().slice(0, 10),
  contact_number: '',
  // Name of taxpayer / registrant
  last_name: '',
  first_name: '',
  middle_name: '',
  address: '',
  // Business
  nature_of_business: '',
  business_name: '',
  business_address: '',
  employee_count: '',
  business_type: 'peddlers',
  papag_count: '',
  // Emergency contact
  emergency_contact_name: '',
  emergency_contact_number: '',
  // Renewal
  previous_permit_code: '',
}

const CIVIL_STATUS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']

export default function Apply() {
  const toast = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { application_code }

  // Valid ID selection + front/back files
  const [idType, setIdType] = useState('')
  const [idFront, setIdFront] = useState(null)
  const [idBack, setIdBack] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function validateStep(n) {
    const e = {}
    if (n === 1 && form.type === 'renewal' && !form.previous_permit_code.trim())
      e.previous_permit_code = 'Existing Permit ID is required for renewal.'
    if (n === 2) {
      // All fields required except CTC No. and Middle Name.
      const required = {
        sex: 'Select a gender.',
        date_of_birth: 'Required.',
        civil_status: 'Select a civil status.',
        application_date: 'Required.',
        contact_number: 'Required.',
        last_name: 'Required.',
        first_name: 'Required.',
        address: 'Required.',
        nature_of_business: 'Required.',
        business_name: 'Required.',
        business_address: 'Required.',
        employee_count: 'Required.',
        papag_count: 'Required.',
        emergency_contact_name: 'Required.',
        emergency_contact_number: 'Required.',
      }
      for (const [k, msg] of Object.entries(required)) {
        if (!String(form[k] ?? '').trim()) e[k] = msg
      }
      if (form.date_of_birth && new Date(form.date_of_birth) > new Date())
        e.date_of_birth = 'Date cannot be in the future.'
    }
    if (n === 3) {
      if (!idType) e.id_type = 'Select the type of valid ID.'
      if (!idFront) e.id_front = 'Upload the front of your valid ID.'
      if (!idBack) e.id_back = 'Upload the back of your valid ID.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep(step)) setStep((s) => s + 1)
  }

  async function handleSubmit() {
    if (!validateStep(3)) {
      setStep(3)
      return
    }
    setSubmitting(true)
    setErrors({})
    try {
      const payload = { ...form, id_type: idType }
      const created = await api.post('/applications', payload)
      const { application_code } = created.data.data
      await uploadDoc(application_code, idFront, 'valid_id_front')
      await uploadDoc(application_code, idBack, 'valid_id_back')
      await api.post(`/applications/${application_code}/submit`, {})
      setResult({ application_code })
      toast.success('Application submitted successfully.')
      setStep(5)
    } catch (err) {
      const details = errorDetails(err)
      if (details) setErrors(details)
      toast.error(errorMessage(err, 'Could not submit the application.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function uploadDoc(code, file, docType) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', docType)
    await api.post(`/applications/${code}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  function copy(text) {
    navigator.clipboard?.writeText(text)
    toast.info('Copied to clipboard.')
  }

  function reset() {
    setForm(EMPTY)
    setResult(null)
    setIdType('')
    setIdFront(null)
    setIdBack(null)
    setStep(1)
  }

  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')

  // Confirmation takes over the whole canvas.
  if (step === 5 && result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm">
          <div className="bg-deepgreen px-6 py-8 text-center text-white">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <CheckCircle2 size={30} />
            </span>
            <h1 className="mt-4 text-xl font-bold">Application Submitted</h1>
            <p className="mx-auto mt-1 max-w-sm text-sm text-green-50/80">
              Keep your Application ID safe. You'll use it to track your permit's progress.
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your Application ID</p>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-surface-muted px-4 py-4">
              <p className="break-all font-mono text-xl font-bold tracking-wide text-darkgreen">
                {result.application_code}
              </p>
              <button
                className="btn-outline shrink-0 px-2.5 py-2"
                onClick={() => copy(result.application_code)}
                aria-label="Copy Application ID"
              >
                <Copy size={15} />
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="btn-primary flex-1"
                onClick={() => navigate(`/track?code=${result.application_code}`)}
              >
                Track My Application <ArrowRight size={16} />
              </button>
              <button className="btn-outline flex-1" onClick={reset}>
                Start Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* ---------------- Left rail: official identity + steps ---------------- */}
        <aside>
          <div className="flex items-center gap-3">
            <img src={logo} alt="City of La Carlota Official Seal" className="h-12 w-12 object-contain" />
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">La Carlota City</p>
              <p className="text-sm font-bold text-darkgreen">Peddler Permit Application</p>
            </div>
          </div>

          {/* Mobile step bar */}
          <div className="mt-6 flex gap-1.5 lg:hidden">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className={`h-1.5 flex-1 rounded-full ${step >= s.n ? 'bg-primary' : 'bg-border-subtle'}`}
              />
            ))}
          </div>

          {/* Desktop vertical step list */}
          <ol className="mt-6 hidden space-y-1 lg:block">
            {STEPS.map((s) => {
              const done = step > s.n
              const active = step === s.n
              return (
                <li
                  key={s.n}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition ${
                    active ? 'bg-surface-muted' : ''
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done
                        ? 'bg-primary text-white'
                        : active
                          ? 'bg-darkgreen text-white'
                          : 'border border-border-subtle text-gray-400'
                    }`}
                  >
                    {done ? <Check size={13} /> : s.n}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-darkgreen' : 'text-gray-700'}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-gray-400">{s.hint}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </aside>

        {/* ---------------- Right: the form card ---------------- */}
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm">
          <div className="min-h-[26rem] p-6 sm:p-8">
            {/* Step 1 — type */}
            {step === 1 && (
              <section className="space-y-6">
                <SectionHead n={1} title="Application Type" sub="Tell us whether this is a new permit or a renewal." />
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { v: 'new', t: 'NEW', d: 'First-time peddler permit application.' },
                    { v: 'renewal', t: 'RENEWAL', d: 'Renew an existing peddler permit.' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: opt.v }))}
                      className={`rounded-xl border p-5 text-left transition ${
                        form.type === opt.v
                          ? 'border-primary bg-surface-muted ring-1 ring-primary/40'
                          : 'border-border-subtle hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-darkgreen">{opt.t}</p>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            form.type === opt.v ? 'border-primary bg-primary text-white' : 'border-gray-300'
                          }`}
                        >
                          {form.type === opt.v && <Check size={12} />}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-gray-500">{opt.d}</p>
                    </button>
                  ))}
                </div>
                {form.type === 'renewal' && (
                  <Field label="Existing Permit ID" required error={errors.previous_permit_code}>
                    <input className="input" value={form.previous_permit_code} onChange={set('previous_permit_code')} />
                  </Field>
                )}
              </section>
            )}

            {/* Step 2 — details */}
            {step === 2 && (
              <section className="space-y-8">
                <SectionHead n={2} title="Applicant Details" sub="Fields marked with an asterisk are required." />

                <FieldGroup title="Basic Information">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Gender" required error={errors.sex}>
                      <select className="input" value={form.sex} onChange={set('sex')}>
                        <option value="">Select…</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </Field>
                    <Field label="Date of Birth" required error={errors.date_of_birth}>
                      <input type="date" max={new Date().toISOString().slice(0, 10)} className="input" value={form.date_of_birth} onChange={set('date_of_birth')} />
                    </Field>
                    <Field label="Civil Status" required error={errors.civil_status}>
                      <select className="input" value={form.civil_status} onChange={set('civil_status')}>
                        <option value="">Select…</option>
                        {CIVIL_STATUS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="CTC No. (Optional)" error={errors.ctc_no}>
                      <input className="input" value={form.ctc_no} onChange={set('ctc_no')} />
                    </Field>
                    <Field label="Date of Application" required error={errors.application_date}>
                      <input type="date" className="input" value={form.application_date} onChange={set('application_date')} />
                    </Field>
                    <Field label="Tel No. / Mobile No." required error={errors.contact_number}>
                      <input className="input" value={form.contact_number} onChange={set('contact_number')} />
                    </Field>
                  </div>
                </FieldGroup>

                <FieldGroup title="Name of Taxpayer / Registrant">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Last Name" required error={errors.last_name}>
                      <input className="input" value={form.last_name} onChange={set('last_name')} />
                    </Field>
                    <Field label="First Name" required error={errors.first_name}>
                      <input className="input" value={form.first_name} onChange={set('first_name')} />
                    </Field>
                    <Field label="Middle Name" error={errors.middle_name}>
                      <input className="input" value={form.middle_name} onChange={set('middle_name')} />
                    </Field>
                  </div>
                  <Field label="Address" required error={errors.address}>
                    <input className="input" value={form.address} onChange={set('address')} />
                  </Field>
                </FieldGroup>

                <FieldGroup title="Business Information">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nature of Business" required error={errors.nature_of_business}>
                      <input className="input" value={form.nature_of_business} onChange={set('nature_of_business')} />
                    </Field>
                    <Field label="Business Name" required error={errors.business_name}>
                      <input className="input" value={form.business_name} onChange={set('business_name')} />
                    </Field>
                  </div>
                  <Field label="Business Address / Location" required error={errors.business_address}>
                    <input className="input" value={form.business_address} onChange={set('business_address')} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="No. of Employee" required error={errors.employee_count}>
                      <input type="number" min="0" className="input" value={form.employee_count} onChange={set('employee_count')} />
                    </Field>
                    <Field label="Type of Business">
                      <input className="input bg-surface-muted" value="PEDDLERS" readOnly />
                    </Field>
                    <Field label="No. of Papag / Lag-it" required error={errors.papag_count}>
                      <input type="number" min="0" className="input" value={form.papag_count} onChange={set('papag_count')} />
                    </Field>
                  </div>
                </FieldGroup>

                <FieldGroup title="In Case of Emergency">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact Person" required error={errors.emergency_contact_name}>
                      <input className="input" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
                    </Field>
                    <Field label="Tel No. / Mobile No." required error={errors.emergency_contact_number}>
                      <input className="input" value={form.emergency_contact_number} onChange={set('emergency_contact_number')} />
                    </Field>
                  </div>
                </FieldGroup>
              </section>
            )}

            {/* Step 3 — valid ID */}
            {step === 3 && (
              <section className="space-y-6">
                <SectionHead
                  n={3}
                  title="Valid ID"
                  sub="Provide at least one valid government ID. Upload a clear photo of the front and back."
                />
                <Field label="Type of Valid ID" required error={errors.id_type}>
                  <select className="input" value={idType} onChange={(e) => setIdType(e.target.value)}>
                    <option value="">Select a valid ID…</option>
                    {VALID_IDS.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <IdUpload label="Front of ID" file={idFront} onPick={setIdFront} error={errors.id_front} />
                  <IdUpload label="Back of ID" file={idBack} onPick={setIdBack} error={errors.id_back} />
                </div>
              </section>
            )}

            {/* Step 4 — review */}
            {step === 4 && (
              <section className="space-y-6">
                <SectionHead n={4} title="Review & Submit" sub="Please confirm your entries before submitting." />
                <ReviewBlock title="Application">
                  <Row k="Type" v={form.type === 'new' ? 'NEW' : 'RENEWAL'} />
                  {form.type === 'renewal' && <Row k="Existing Permit ID" v={form.previous_permit_code} />}
                </ReviewBlock>
                <ReviewBlock title="Applicant">
                  <Row k="Name" v={fullName || '—'} />
                  <Row k="Gender" v={form.sex ? form.sex[0].toUpperCase() + form.sex.slice(1) : '—'} />
                  <Row k="Date of Birth" v={form.date_of_birth || '—'} />
                  <Row k="Civil Status" v={form.civil_status || '—'} />
                  <Row k="CTC No." v={form.ctc_no || '—'} />
                  <Row k="Date of Application" v={form.application_date || '—'} />
                  <Row k="Tel / Mobile" v={form.contact_number || '—'} />
                  <Row k="Address" v={form.address || '—'} />
                </ReviewBlock>
                <ReviewBlock title="Business">
                  <Row k="Nature of Business" v={form.nature_of_business || '—'} />
                  <Row k="Business Name" v={form.business_name || '—'} />
                  <Row k="Business Address" v={form.business_address || '—'} />
                  <Row k="No. of Employee" v={form.employee_count || '—'} />
                  <Row k="Type of Business" v="PEDDLERS" />
                  <Row k="No. of Papag / Lag-it" v={form.papag_count || '—'} />
                </ReviewBlock>
                <ReviewBlock title="Emergency & ID">
                  <Row k="Emergency Contact" v={form.emergency_contact_name || '—'} />
                  <Row k="Emergency Tel / Mobile" v={form.emergency_contact_number || '—'} />
                  <Row k="Valid ID" v={idType || '—'} />
                  <Row k="ID Images" v={`${idFront ? 'Front ✓' : 'Front —'} · ${idBack ? 'Back ✓' : 'Back —'}`} />
                </ReviewBlock>
              </section>
            )}
          </div>

          {/* Sticky footer actions */}
          <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-muted/60 px-6 py-4 sm:px-8">
            {step > 1 ? (
              <button className="btn-outline" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <span className="text-xs text-gray-400">Step {step} of {STEPS.length}</span>
            )}

            {step < 4 && (
              <button className="btn-primary" onClick={next}>
                Continue <ArrowRight size={16} />
              </button>
            )}
            {step === 4 && (
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Spinner /> : <CheckCircle2 size={16} />} Submit Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- small presentational helpers ---------------- */

function SectionHead({ n, title, sub }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
        <span className="h-px w-6 bg-secondary" />
        Step {n}
      </div>
      <h2 className="mt-2 text-xl font-bold text-darkgreen">{title}</h2>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

function FieldGroup({ title, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-darkgreen">{title}</h3>
      {children}
    </div>
  )
}

function ReviewBlock({ title, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      <p className="border-b border-border-subtle bg-surface-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <dl className="divide-y divide-border-subtle">{children}</dl>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-right font-medium text-gray-800">{v}</dd>
    </div>
  )
}

/** A single front/back ID image dropzone with preview. */
function IdUpload({ label, file, onPick, error }) {
  const preview = file ? URL.createObjectURL(file) : null
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <IdCard size={14} /> {label} <span className="text-red-500">*</span>
      </label>
      {preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border-subtle">
          <img src={preview} alt={label} className="h-44 w-full object-cover" />
          <button
            type="button"
            onClick={() => onPick(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            aria-label="Remove"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-surface-muted text-sm text-gray-500 transition hover:border-primary/50 hover:bg-surface-muted/60">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload size={18} />
          </span>
          <span className="font-medium text-gray-600">Tap to upload</span>
          <span className="text-xs text-gray-400">JPG or PNG, max 5MB</span>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
        </label>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
