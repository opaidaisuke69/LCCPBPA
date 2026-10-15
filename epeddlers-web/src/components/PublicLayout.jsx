import { Link, NavLink, Outlet } from 'react-router-dom'
import { Store, Menu, X } from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/apply', label: 'Apply for Permit' },
  { to: '/track', label: 'Track Application' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Store size={20} />
            </span>
            <span className="text-lg font-bold text-darkgreen">
              ePeddlers<span className="ml-1 text-xs font-normal text-gray-500">La Carlota City</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-surface-muted text-primary' : 'text-gray-600 hover:text-darkgreen'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link to="/login" className="btn-primary ml-2">
              Staff Login
            </Link>
          </nav>

          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <nav className="flex flex-col gap-1 border-t border-border-subtle px-4 py-2 md:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
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
            <Link to="/login" className="btn-primary mt-1" onClick={() => setOpen(false)}>
              Staff Login
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border-subtle bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500">
          <p className="font-medium text-darkgreen">ePeddlers — La Carlota City</p>
          <p className="mt-1">
            Peddler Business Permit Application and Vendor Mapping System. For authorized city
            personnel and registered peddlers.
          </p>
          <p className="mt-2 text-xs">© {new Date().getFullYear()} City Government of La Carlota, Negros Occidental.</p>
        </div>
      </footer>
    </div>
  )
}
