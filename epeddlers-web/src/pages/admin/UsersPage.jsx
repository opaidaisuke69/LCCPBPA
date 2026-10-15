import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, KeyRound, Power } from 'lucide-react'
import api, { errorMessage, errorDetails } from '../../lib/api'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { Skeleton, EmptyState, Spinner, Field } from '../../components/ui'
import { useToast } from '../../components/Toast'

export default function UsersPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const debounced = useDebounced(search, 300)
  const params = useMemo(() => ({ search: debounced }), [debounced])
  const { items, total, loading, hasMore, loadMore, refresh } = useInfiniteList('/users', params)

  async function toggleStatus(u) {
    const next = u.status === 'active' ? 'inactive' : 'active'
    try {
      await api.patch(`/users/${u.id}/status`, { status: next })
      toast.success(`User ${next === 'active' ? 'activated' : 'deactivated'}.`)
      refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function resetPw(u) {
    try {
      const res = await api.post(`/users/${u.id}/reset-password`, {})
      toast.success(`Temp password: ${res.data.data.temp_password}`, 10000)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-darkgreen">User Management</h1>
          <p className="text-sm text-gray-500">Create and manage staff accounts.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} /> New User
        </button>
      </div>

      <div className="relative mt-4 max-w-md">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input className="input pl-9" placeholder="Search users..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="mt-3 text-xs text-gray-400">{total} user(s)</p>

      <div className="card mt-2 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Username</th>
                <th className="px-4 py-2.5">Roles</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{u.full_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{u.username}</td>
                  <td className="px-4 py-2.5 text-gray-600">{u.roles?.map((r) => r.name).join(', ')}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button className="btn-outline px-2 py-1" title="Reset password" onClick={() => resetPw(u)}>
                        <KeyRound size={14} />
                      </button>
                      <button className="btn-outline px-2 py-1" title="Toggle status" onClick={() => toggleStatus(u)}>
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button className="btn-outline" onClick={loadMore} disabled={loading}>
            {loading ? <Spinner /> : null} Load more
          </button>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh() }}
        />
      )}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }) {
  const toast = useToast()
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ full_name: '', username: '', email: '', phone: '', roles: [] })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/users/roles').then((r) => setRoles(r.data.data)).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  function toggleRole(code) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(code) ? f.roles.filter((r) => r !== code) : [...f.roles, code],
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      const res = await api.post('/users', form)
      toast.success(`Created. Temp password: ${res.data.data.temp_password}`, 12000)
      onCreated()
    } catch (err) {
      setErrors(errorDetails(err) || {})
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-darkgreen">New User</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Full Name" required error={errors.full_name}>
            <input className="input" value={form.full_name} onChange={set('full_name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username" required error={errors.username}>
              <input className="input" value={form.username} onChange={set('username')} />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input className="input" value={form.phone} onChange={set('phone')} />
            </Field>
          </div>
          <Field label="Email" required error={errors.email}>
            <input className="input" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Roles" required error={errors.roles}>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button type="button" key={r.code} onClick={() => toggleRole(r.code)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    form.roles.includes(r.code)
                      ? 'border-primary bg-primary text-white'
                      : 'border-border-subtle text-gray-600'
                  }`}>
                  {r.name}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn-primary" disabled={busy}>
              {busy ? <Spinner /> : null} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
