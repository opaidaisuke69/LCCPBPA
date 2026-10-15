import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.data)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Deferred to a microtask so state updates don't run synchronously in the effect.
    Promise.resolve().then(() => loadMe())
  }, [loadMe])

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    setToken(res.data.data.token)
    setUser(res.data.data.user)
    return res.data.data.user
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore network errors on logout
    }
    setToken(null)
    setUser(null)
  }

  function hasPermission(perm) {
    return user?.permissions?.includes(perm) ?? false
  }
  function hasRole(code) {
    return user?.roles?.some((r) => r.code === code) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, hasRole, reload: loadMe }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
