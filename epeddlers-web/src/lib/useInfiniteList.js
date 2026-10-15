import { useCallback, useEffect, useRef, useState } from 'react'
import api from './api'

/**
 * Infinite-scroll list backed by server pagination.
 * Resets when `params` change (e.g. a new search query).
 */
export function useInfiniteList(url, params = {}, perPage = 20) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const paramsKey = JSON.stringify(params)
  const reqSeq = useRef(0)

  const loadPage = useCallback(
    async (p, replace) => {
      setLoading(true)
      setError(null)
      const mySeq = ++reqSeq.current
      try {
        const res = await api.get(url, { params: { ...params, page: p, per_page: perPage } })
        if (mySeq !== reqSeq.current) return // stale
        const newItems = res.data.data || []
        setTotal(res.data.meta?.total ?? newItems.length)
        setItems((prev) => (replace ? newItems : [...prev, ...newItems]))
      } catch (err) {
        if (mySeq === reqSeq.current) setError(err)
      } finally {
        if (mySeq === reqSeq.current) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, paramsKey, perPage],
  )

  // Reset + load first page when params change (deferred to a microtask).
  useEffect(() => {
    Promise.resolve().then(() => {
      setItems([])
      setPage(1)
      loadPage(1, true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  const hasMore = items.length < total
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    const next = page + 1
    setPage(next)
    loadPage(next, false)
  }, [loading, hasMore, page, loadPage])

  const refresh = useCallback(() => {
    setPage(1)
    loadPage(1, true)
  }, [loadPage])

  return { items, total, loading, error, hasMore, loadMore, refresh }
}
