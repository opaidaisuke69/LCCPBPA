import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Store, LogIn } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/api'
import { Field, Spinner } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const user = await login(username, password)
      toast.success(`Welcome, ${user.full_name}.`)
      // Route by role; dashboards are built in later phases.
      if (user.roles?.some((r) => r.code === 'treasury')) navigate('/treasury')
      else navigate('/admin')
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Store size={22} />
          </span>
          <span className="text-xl font-bold text-darkgreen">ePeddlers</span>
        </Link>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-darkgreen">Staff Login</h1>
          <p className="mt-1 text-sm text-gray-500">For authorized city personnel only.</p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Username or Email">
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </Field>
            <Field label="Password">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? <Spinner /> : <LogIn size={16} />} Sign In
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          <Link to="/" className="hover:text-primary">← Back to public site</Link>
        </p>
      </div>
    </div>
  )
}
