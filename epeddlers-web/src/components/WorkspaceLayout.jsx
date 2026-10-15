import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import NotificationBell from './NotificationBell'
import logo from '../assets/logo.png'

export default function WorkspaceLayout({ title, nav }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const initials = (user?.full_name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const NavItems = ({ onNavigate }) => (
    <nav className="space-y-1">
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-secondary transition-all ${
                  isActive ? 'w-1' : 'w-0'
                }`}
              />
              <n.icon size={18} className="shrink-0" />
              {n.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const Brand = () => (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 shadow-sm">
        <img src={logo} alt="City of La Carlota Official Seal" className="h-full w-full object-contain" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-bold leading-tight text-white">ePeddlers</p>
        <p className="truncate text-xs text-white/60">{title} Workspace</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-full bg-surface-muted">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="hidden w-64 shrink-0 flex-col bg-darkgreen md:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <div className="px-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Menu</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <NavItems />
        </div>
        <div className="m-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
              {initials || '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.full_name}</p>
              <p className="truncate text-xs text-white/50">{user?.roles?.map((r) => r.name).join(', ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* ---------------- Main ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (all sizes) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border-subtle bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-gray-600 hover:bg-surface-muted md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-darkgreen md:hidden">ePeddlers · {title}</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* ---------------- Mobile drawer ---------------- */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col bg-darkgreen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-5">
              <Brand />
              <button className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavItems onNavigate={() => setOpen(false)} />
            </div>
            <div className="m-3 rounded-xl bg-white/5 p-3">
              <p className="truncate text-sm font-medium text-white">{user?.full_name}</p>
              <p className="truncate text-xs text-white/50">{user?.roles?.map((r) => r.name).join(', ')}</p>
              <button
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/20"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
