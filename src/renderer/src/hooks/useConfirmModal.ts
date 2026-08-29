import { useState, useCallback } from 'react'

export interface UseConfirmModalReturn<T> {
  target: T | null
  isOpen: boolean
  loading: boolean
  requestConfirm: (item: T) => void
  handleConfirm: (onConfirmAction: (item: T) => Promise<void>) => Promise<void>
  handleCancel: () => void
}

export function useConfirmModal<T = unknown>(): UseConfirmModalReturn<T> {
  const [target, setTarget] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const requestConfirm = useCallback((item: T) => {
    setTarget(item)
  }, [])

  const handleCancel = useCallback(() => {
    if (loading) return
    setTarget(null)
  }, [loading])

  const handleConfirm = useCallback(
    async (onConfirmAction: (item: T) => Promise<void>) => {
      if (!target) return
      try {
        setLoading(true)
        await onConfirmAction(target)
        setTarget(null)
      } finally {
        setLoading(false)
      }
    },
    [target]
  )

  return {
    target,
    isOpen: Boolean(target),
    loading,
    requestConfirm,
    handleConfirm,
    handleCancel
  }
}
