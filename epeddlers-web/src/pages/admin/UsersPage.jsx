import { useEffect, useMemo, useState } from 'react'
import { UserPlus, KeyRound, Power, Users as UsersIcon, X } from 'lucide-react'
import api, { errorMessage, errorDetails } from '../../lib/api'
import { useDebounced } from '../../lib/hooks'
import { useInfiniteList } from '../../lib/useInfiniteList'
import {
  PageHeader, Skeleton, EmptyState, Spinner, Field, Toolbar, SearchInput,
  Avatar, TableWrap, TableHead, Th,
} from '../../components/ui'
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
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        subtitle="Create and manage staff accounts and access."
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <UserPlus size={16} /> New User
          </button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search users…" className="max-w-md" />
        <span className="ml-auto text-xs text-gray-400">{total} user{total === 1 ? '' : 's'}</span>
      </Toolbar>

      {loading && items.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-border-subtle bg-white p-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-white">
          <EmptyState icon={UsersIcon} title="No users found" hint="Create a staff account to get started." />
        </div>
      ) : (
        <TableWrap>
          <TableHead>
            <Th>Name</Th>
            <Th>Username</Th>
            <Th>Roles</Th>
            <Th>Status</Th>
            <Th right>Actions</Th>
          </TableHead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((u) => (
              <tr key={u.id} className="transition hover:bg-surface-muted/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.full_name} size={34} tone={u.status === 'active' ? 'primary' : 'slate'} />
                    <span className="font-medium text-gray-800">{u.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.username}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.map((r) => (
                      <span key={r.code} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {r.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button className="btn-outline px-2 py-1.5" title="Reset password" onClick={() => resetPw(u)}>
                      <KeyRound size={14} />
                    </button>
                    <button className="btn-outline px-2 py-1.5" title="Toggle status" onClick={() => toggleStatus(u)}>
                      <Power size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {hasMore && (
        <div className="flex justify-center">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus size={18} />
            </span>
            <h2 className="text-base font-semibold text-darkgreen">New User</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-muted">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-6">
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
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    form.roles.includes(r.code)
                      ? 'border-primary bg-primary text-white'
                      : 'border-border-subtle text-gray-600 hover:border-primary/50'
                  }`}>
                  {r.name}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn-primary" disabled={busy}>
              {busy ? <Spinner /> : null} Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
