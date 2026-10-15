import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/api'
import { Field, Spinner } from '../components/ui'
import logo from '../assets/logo.png'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const user = await login(username, password)
      toast.success(`Welcome, ${user.full_name}.`)
      if (user.roles?.some((r) => r.code === 'treasury')) navigate('/treasury')
      else navigate('/admin')
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-muted p-4">
      <div className="grid w-full max-w-2xl overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-lg sm:grid-cols-[0.9fr_1.1fr]">
        {/* Left: logo */}
        <div className="hidden items-center justify-center bg-deepgreen p-6 sm:flex">
          <img
            src={logo}
            alt="City of La Carlota Official Seal"
            className="w-full max-w-[15rem] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Right: sign-in form */}
        <div className="p-7">
          {/* Mobile logo */}
          <div className="mb-5 flex justify-center sm:hidden">
            <img src={logo} alt="City of La Carlota Official Seal" className="h-24 w-24 object-contain" />
          </div>

          <h2 className="text-lg font-bold text-darkgreen">Sign in</h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Username or Email">
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:bg-surface-muted hover:text-gray-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? <Spinner /> : <LogIn size={16} />} Sign In
            </button>
          </form>

          <Link
            to="/"
            className="mt-5 flex items-center justify-center gap-1.5 text-sm text-gray-500 transition hover:text-primary"
          >
            <ArrowLeft size={15} /> Back to site
          </Link>
        </div>
      </div>
    </div>
  )
}
