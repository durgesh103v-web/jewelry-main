import { useState, useCallback } from 'react'

export interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | string | null
}

export interface UseAsyncReturn<T, Args extends unknown[]> extends UseAsyncState<T> {
  execute: (...args: Args) => Promise<T | null>
  reset: () => void
  setData: React.Dispatch<React.SetStateAction<T | null>>
}

export function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate = false
): UseAsyncReturn<T, Args> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(immediate)
  const [error, setError] = useState<Error | string | null>(null)

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await asyncFunction(...args)
        setData(result)
        return result
      } catch (err) {
        const errObj = err instanceof Error ? err : String(err)
        setError(errObj)
        return null
      } finally {
        setLoading(false)
      }
    },
    [asyncFunction]
  )

  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData
  }
}
