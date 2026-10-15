import { Link } from 'react-router-dom'
import {
  FileText, Search, ClipboardCheck, ShieldCheck, Receipt, BadgeCheck, ArrowRight,
  Eye, QrCode, CheckCircle2, MapPin, Phone, Mail, Building2,
} from 'lucide-react'
import logo from '../../assets/logo.png'

const STEPS = [
  { icon: FileText, title: 'Apply', text: 'Choose New Application or Renewal and complete the guided form.' },
  { icon: ClipboardCheck, title: 'Submit', text: 'Upload requirements and receive your Application ID instantly.' },
  { icon: Search, title: 'Inspect', text: 'City officers conduct inspection and sanitary review.' },
  { icon: Receipt, title: 'Pay', text: 'Settle fees; Treasury verifies your payment on record.' },
  { icon: BadgeCheck, title: 'Permit', text: 'Receive your official permit once fully approved.' },
]

const STATS = [
  { value: '5', label: 'Simple steps' },
  { value: '100%', label: 'Online tracking' },
  { value: '24/7', label: 'Apply anytime' },
  { value: 'QR', label: 'Verified permits' },
]

export default function Landing() {
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section id="home" className="relative overflow-hidden bg-deepgreen text-white">
        {/* Fine grid texture + top emphasis — subtle, like official letterhead */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 55%, transparent 100%)',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary via-accent to-secondary" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          {/* Left: copy */}
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-green-100/70">
              <span className="h-px w-8 bg-secondary" />
              Official City Service
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-green-50/80">
              <MapPin size={14} /> City Government of La Carlota, Negros Occidental
            </p>

            <h1 className="mt-6 font-extrabold leading-[1.05] tracking-tight text-4xl md:text-5xl lg:text-[3.4rem]">
              Peddler business permits,
              <br className="hidden sm:block" /> handled online.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-green-50/85">
              Apply, submit your requirements, and follow every step of your peddler
              permit — from the first form to the issued permit — without the repeat trips
              to City Hall.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-deepgreen transition hover:bg-green-50"
              >
                Apply for a Permit <ArrowRight size={16} />
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-2 border-b border-white/40 pb-0.5 text-sm font-semibold text-white transition hover:border-white"
              >
                Track an application
              </Link>
            </div>

            {/* Trust row */}
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-sm text-green-50/80">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-secondary" /> Official city system
              </span>
              <span className="inline-flex items-center gap-2">
                <QrCode size={16} className="text-secondary" /> QR-verified permits
              </span>
              <span className="inline-flex items-center gap-2">
                <Eye size={16} className="text-secondary" /> Real-time status
              </span>
            </div>
          </div>

          {/* Right: official emblem masthead */}
          <div className="relative hidden lg:flex lg:justify-center">
            <div className="relative text-center">
              {/* concentric emblem rings */}
              <div className="relative mx-auto flex h-96 w-96 items-center justify-center">
                {/* animated signal pulse rings */}
                <span aria-hidden className="signal-ring absolute inset-10 rounded-full border-2 border-secondary/60" />
                <span aria-hidden className="signal-ring signal-ring-delay-1 absolute inset-10 rounded-full border-2 border-secondary/50" />
                <span aria-hidden className="signal-ring signal-ring-delay-2 absolute inset-10 rounded-full border-2 border-secondary/40" />

                {/* static emblem frame */}
                <span aria-hidden className="absolute inset-0 rounded-full border border-white/15" />
                <span aria-hidden className="absolute inset-8 rounded-full border border-white/10" />
                <span aria-hidden className="absolute inset-0 rounded-full bg-white/[0.03]" />
                <img
                  src={logo}
                  alt="City of La Carlota Official Seal"
                  className="relative h-72 w-72 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-green-100/70">
                City of La Carlota
              </p>
              <p className="mt-1 text-sm text-green-50/70">Office of the City Mayor · Business Permits</p>
            </div>
          </div>
        </div>

        {/* Stats row integrated into the hero base */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/10 px-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="px-4 py-6 text-center sm:text-left">
                <p className="text-2xl font-extrabold text-white md:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-green-100/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section id="how-it-works" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
              <span className="h-px w-8 bg-secondary" />
              The Process
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-darkgreen md:text-4xl">
              From application to issued permit
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              Five clear steps, each tracked online so you always know where your permit stands.
            </p>
          </div>

          <ol className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="group relative pl-5">
                {/* left accent bar */}
                <span
                  aria-hidden
                  className="absolute left-0 top-1 h-full w-0.5 bg-border-subtle transition group-hover:bg-primary"
                />
                {/* ghosted step number */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-0 select-none text-6xl font-black leading-none text-surface-muted"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-darkgreen text-white">
                  <s.icon size={20} />
                </span>
                <h3 className="relative mt-5 flex items-center gap-2 text-lg font-semibold text-darkgreen">
                  <span className="text-xs font-bold text-primary">STEP {i + 1}</span>
                </h3>
                <p className="relative text-xl font-bold text-darkgreen">{s.title}</p>
                <p className="relative mt-2 max-w-xs text-sm leading-relaxed text-gray-600">{s.text}</p>
              </li>
            ))}
          </ol>

          <p className="mt-14 border-t border-border-subtle pt-6 text-sm text-gray-400">
            Processing steps may vary according to the city's approved requirements.
          </p>
        </div>
      </section>

      {/* ============================ ABOUT + MISSION/VISION ============================ */}
      <section id="about" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16">
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
              <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-gradient-to-br from-surface-muted to-white p-6">
                <img
                  src={logo}
                  alt="City of La Carlota Official Seal"
                  className="h-20 w-20 shrink-0 object-contain"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Official Seal</p>
                  <p className="mt-1 font-semibold text-darkgreen">City Government of La Carlota</p>
                  <p className="mt-0.5 text-sm text-gray-500">Negros Occidental, Philippines</p>
                </div>
              </div>
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
        </div>
      </section>

      {/* ============================ CONTACT ============================ */}
      <section id="contact" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">Contact &amp; Help</span>
            <h2 className="mt-2 text-3xl font-bold text-darkgreen">We're here to help</h2>
            <p className="mt-3 text-gray-600">
              For assistance with your peddler permit application, reach the City Government of
              La Carlota office handling business permits during office hours.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-subtle bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 size={22} />
              </span>
              <h3 className="mt-4 font-semibold text-darkgreen">City Hall</h3>
              <p className="mt-1 text-sm text-gray-600">La Carlota City, Negros Occidental</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone size={22} />
              </span>
              <h3 className="mt-4 font-semibold text-darkgreen">Phone</h3>
              <p className="mt-1 text-sm text-gray-600">Administrator-configurable</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail size={22} />
              </span>
              <h3 className="mt-4 font-semibold text-darkgreen">Email</h3>
              <p className="mt-1 text-sm text-gray-600">Administrator-configurable</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CTA BAND ============================ */}
      <section className="px-4 py-16">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-darkgreen px-6 py-14 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-secondary/30 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          </div>
          <img
            src={logo}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 w-72 max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
          />
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
