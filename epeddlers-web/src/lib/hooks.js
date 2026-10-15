import { useCallback, useEffect, useRef, useState } from 'react'
import api from './api'

/**
 * Background polling that fetches without disrupting UI state.
 * - Pauses when the tab is hidden.
 * - Cancels in-flight requests before starting a new one.
 * - Ignores stale responses (only the latest request updates state).
 */
export function usePolling(url, { interval = 3000, params = {}, enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)

  const seq = useRef(0)
  const controllerRef = useRef(null)
  const paramsKey = JSON.stringify(params)

  const fetchOnce = useCallback(async () => {
    if (document.hidden) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const mySeq = ++seq.current
    try {
      const res = await api.get(url, { params, signal: controller.signal })
      if (mySeq === seq.current) {
        setData(res.data)
        setError(null)
        setLastUpdated(new Date())
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED' && mySeq === seq.current) {
        setError(err)
      }
    } finally {
      if (mySeq === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey])

  useEffect(() => {
    if (!enabled) return
    let timer
    const loop = async () => {
      await fetchOnce()
      timer = setTimeout(loop, interval)
    }
    loop()
    const onVisible = () => { if (!document.hidden) fetchOnce() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      controllerRef.current?.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchOnce, interval, enabled])

  return { data, error, loading, lastUpdated, refresh: fetchOnce }
}

/** Debounce a changing value (default 300ms). */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
