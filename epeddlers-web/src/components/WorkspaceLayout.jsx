import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Store, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import NotificationBell from './NotificationBell'

export default function WorkspaceLayout({ title, nav }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-full bg-surface-muted">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border-subtle bg-darkgreen text-white md:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Store size={20} />
          </span>
          <div className="flex-1">
            <p className="font-bold leading-tight">ePeddlers</p>
            <p className="text-xs text-white/60">{title}</p>
          </div>
          <NotificationBell />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="px-2 text-sm font-medium">{user?.full_name}</p>
          <p className="px-2 text-xs text-white/60">{user?.roles?.map((r) => r.name).join(', ')}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border-subtle bg-darkgreen px-4 py-3 md:hidden">
          <span className="font-bold text-white">ePeddlers · {title}</span>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={handleLogout} className="rounded-lg p-2 text-white/80 hover:bg-white/10">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border-subtle bg-white px-2 py-2 md:hidden">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                  isActive ? 'bg-surface-muted text-primary' : 'text-gray-600'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
