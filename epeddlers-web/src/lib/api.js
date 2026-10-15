import axios from 'axios'

const TOKEN_KEY = 'ep_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // On auth failure, clear the token so the app returns to login.
    if (err.response?.status === 401) {
      setToken(null)
    }
    return Promise.reject(err)
  },
)

/** Normalize an axios error into a readable message. */
export function errorMessage(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.error?.message || err?.message || fallback
}

/** Field-level validation details, if any. */
export function errorDetails(err) {
  return err?.response?.data?.error?.details || null
}

export default api
