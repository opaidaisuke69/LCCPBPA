import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
import api from '../lib/api'
import { usePolling } from '../lib/hooks'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data, refresh } = usePolling('/notifications', { interval: 5000, params: { per_page: 10 } })

  const items = data?.data || []
  const unread = data?.meta?.unread || 0

  async function markAll() {
    await api.post('/notifications/read-all')
    refresh()
  }

  async function openItem(n) {
    if (!n.is_read) {
      await api.post(`/notifications/${n.id}/read`)
      refresh()
    }
    // Only follow web links (mobile deep-links start with /(app)).
    if (n.link && n.link.startsWith('/') && !n.link.startsWith('/(')) {
      navigate(n.link)
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-white/80 hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border-subtle bg-white text-gray-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
              <span className="text-sm font-semibold text-darkgreen">Notifications</span>
              {unread > 0 && (
                <button onClick={markAll} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`block w-full border-b border-border-subtle px-4 py-2.5 text-left hover:bg-surface-muted ${
                      n.is_read ? '' : 'bg-green-50/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-gray-400">{new Date(n.created_at + 'Z').toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
