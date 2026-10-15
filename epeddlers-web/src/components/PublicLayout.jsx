import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X, LogIn } from 'lucide-react'
import { useState } from 'react'
import logo from '../assets/logo.png'

// In-page section links (resolve to the landing page sections)
const SECTIONS = [
  { href: '/#home', label: 'Home' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
]

// Full application routes
const ROUTES = [{ to: '/track', label: 'Track Application' }]

export default function PublicLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="City of La Carlota Official Seal"
              className="h-11 w-11 shrink-0 object-contain"
            />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-bold text-darkgreen">ePeddlers</span>
              <span className="text-[11px] font-medium text-gray-500">La Carlota City</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {SECTIONS.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition hover:text-darkgreen"
              >
                {n.label}
              </a>
            ))}
            {ROUTES.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-surface-muted text-primary' : 'text-gray-600 hover:text-darkgreen'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link to="/login" className="btn-primary ml-2 gap-1.5">
              <LogIn size={15} /> Login
            </Link>
          </nav>

          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <nav className="flex flex-col gap-1 border-t border-border-subtle px-4 py-2 md:hidden">
            {SECTIONS.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600"
              >
                {n.label}
              </a>
            ))}
            {ROUTES.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-surface-muted text-primary' : 'text-gray-600'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link to="/login" className="btn-primary mt-1 gap-1.5" onClick={() => setOpen(false)}>
              <LogIn size={15} /> Login
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border-subtle bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500">
          <div className="flex items-start gap-3">
            <img
              src={logo}
              alt="City of La Carlota Official Seal"
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div>
              <p className="font-semibold text-darkgreen">ePeddlers — La Carlota City</p>
              <p className="mt-1 max-w-xl">
                Peddler Business Permit Application and Vendor Mapping System. For authorized city
                personnel and registered peddlers.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} City Government of La Carlota, Negros Occidental.</p>
        </div>
      </footer>
    </div>
  )
}
