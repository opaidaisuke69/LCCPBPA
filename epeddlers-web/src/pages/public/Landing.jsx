import { Link } from 'react-router-dom'
import {
  FileText, Search, ClipboardCheck, ShieldCheck, Receipt, BadgeCheck, ArrowRight,
  Store, Clock, FolderCheck, Eye, QrCode, Smartphone, CheckCircle2, MapPin,
} from 'lucide-react'

const STEPS = [
  { icon: FileText, title: 'Apply', text: 'Choose New Application or Renewal and complete the guided form.' },
  { icon: ClipboardCheck, title: 'Submit', text: 'Upload requirements and receive your Application ID instantly.' },
  { icon: Search, title: 'Inspect', text: 'City officers conduct inspection and sanitary review.' },
  { icon: Receipt, title: 'Pay', text: 'Settle fees; Treasury verifies your payment on record.' },
  { icon: BadgeCheck, title: 'Permit', text: 'Receive your official permit once fully approved.' },
]

const FEATURES = [
  { icon: Clock, title: 'Faster Processing', text: 'Submit online and move through each stage without repeat trips to the office.' },
  { icon: Eye, title: 'Transparent Tracking', text: 'Follow your application status and timeline with your ID and PIN.' },
  { icon: FolderCheck, title: 'Organized Records', text: 'Applications, permits, payments, and history kept in one secure registry.' },
  { icon: QrCode, title: 'Verifiable Permits', text: 'Officers verify permits in the field by scanning a secure QR code.' },
  { icon: ShieldCheck, title: 'Accountable Treasury', text: 'Payments are verified and reconciled with a complete audit trail.' },
  { icon: Smartphone, title: 'Mobile Field App', text: 'Inspection and sanitary officers work on the ground from any device.' },
]

const STATS = [
  { value: '5', label: 'Simple steps' },
  { value: '100%', label: 'Online tracking' },
  { value: '24/7', label: 'Apply anytime' },
]

export default function Landing() {
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden bg-deepgreen text-white">
        {/* Decorative gradient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <MapPin size={13} /> City Government of La Carlota · Negros Occidental
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
              Peddler Permits,
              <span className="block bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                now fully online.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-green-50/90">
              Apply, upload requirements, and track your peddler business permit from
              anywhere. Faster processing, organized records, and clear status updates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-deepgreen shadow-lg shadow-black/20 transition hover:bg-green-50"
              >
                Apply for Permit <ArrowRight size={16} />
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Track Application
              </Link>
            </div>

            {/* Stat strip */}
            <div className="mt-10 flex gap-8">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-extrabold">{s.value}</p>
                  <p className="text-xs uppercase tracking-wide text-green-100/70">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual card */}
          <div className="relative hidden md:block">
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-4 rounded-3xl bg-white/10 blur-2xl" />
              <div className="relative rounded-3xl border border-white/15 bg-white/95 p-6 text-gray-800 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                      <Store size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-darkgreen">ePeddlers</p>
                      <p className="text-[11px] text-gray-400">Application #EP-7F3K9Q2A</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-800">
                    Approved
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    ['Submitted', true],
                    ['Inspection', true],
                    ['Sanitary review', true],
                    ['Payment verified', true],
                    ['Permit issued', true],
                  ].map(([label, done]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          done ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                      </span>
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-muted p-3">
                  <div className="flex items-center gap-2 text-darkgreen">
                    <QrCode size={28} />
                    <div>
                      <p className="text-xs font-semibold">Scan to verify</p>
                      <p className="text-[11px] text-gray-400">Valid permit</p>
                    </div>
                  </div>
                  <BadgeCheck size={22} className="text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div aria-hidden className="relative">
          <svg viewBox="0 0 1440 80" className="block w-full" preserveAspectRatio="none">
            <path fill="#f5f7f4" d="M0,48 C240,80 480,80 720,56 C960,32 1200,16 1440,40 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary">Why ePeddlers</span>
          <h2 className="mt-2 text-3xl font-bold text-darkgreen">Built for peddlers and the city</h2>
          <p className="mt-3 text-gray-600">
            A modern, trustworthy service that keeps permit records organized and processing
            transparent from application to approval.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border-subtle bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 font-semibold text-darkgreen">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">The Process</span>
            <h2 className="mt-2 text-3xl font-bold text-darkgreen">How it works</h2>
            <p className="mt-3 text-gray-600">Five clear steps from application to an issued permit.</p>
          </div>

          <div className="relative mt-12">
            {/* connecting line (desktop) */}
            <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 lg:block" />
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative text-center">
                  <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
                    <s.icon size={20} />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-darkgreen text-[11px] font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-darkgreen">{s.title}</h3>
                  <p className="mx-auto mt-1 max-w-[16rem] text-sm text-gray-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-10 text-center text-sm text-gray-400">
            Processing steps may vary according to the city's approved requirements.
          </p>
        </div>
      </section>

      {/* ============================ ABOUT + MISSION/VISION ============================ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">About the System</span>
            <h2 className="mt-2 text-3xl font-bold text-darkgreen">
              Digitizing peddler permits for La Carlota City
            </h2>
            <p className="mt-4 text-gray-600">
              ePeddlers streamlines permit application, inspection, sanitary review, treasury
              verification, and permit issuance — while keeping peddler records organized and
              auditable. The platform is also prepared for future vendor mapping.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Reduce paperwork and repeat office visits',
                'Keep an organized, searchable peddler registry',
                'Improve verification across departments',
                'Support treasury accountability and transparent collections',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-5">
            <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-white to-surface-muted p-6">
              <div className="flex items-center gap-2 text-darkgreen">
                <ShieldCheck size={20} />
                <h3 className="text-lg font-semibold">Mission</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Draft — pending official approval by the City Government of La Carlota.
                This content is administrator-configurable.
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-white to-surface-muted p-6">
              <div className="flex items-center gap-2 text-darkgreen">
                <BadgeCheck size={20} />
                <h3 className="text-lg font-semibold">Vision</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Draft — pending official approval by the City Government of La Carlota.
                This content is administrator-configurable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CTA BAND ============================ */}
      <section className="px-4 pb-16">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-darkgreen px-6 py-14 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-secondary/30 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold">Ready to apply for your permit?</h2>
            <p className="mx-auto mt-3 max-w-xl text-green-50/90">
              Start your application in minutes and track every step online. Already applied?
              Check your status anytime with your Application ID and PIN.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-deepgreen shadow-lg transition hover:bg-green-50"
              >
                Apply for Permit <ArrowRight size={16} />
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Track Application
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
