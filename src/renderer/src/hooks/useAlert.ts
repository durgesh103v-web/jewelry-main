import { useState, useCallback, useRef, useEffect } from 'react'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertState {
  type: AlertType
  message: string
}

export interface UseAlertReturn {
  alert: AlertState | null
  showAlert: (type: AlertType, message: string, autoHideMs?: number) => void
  clearAlert: () => void
}

export function useAlert(defaultTimeoutMs = 3500): UseAlertReturn {
  const [alert, setAlert] = useState<AlertState | null>(null)
  const timerRef = useRef<number | null>(null)

  const clearAlert = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setAlert(null)
  }, [])

  const showAlert = useCallback(
    (type: AlertType, message: string, autoHideMs = defaultTimeoutMs) => {
      clearAlert()
      setAlert({ type, message })

      if (autoHideMs > 0) {
        timerRef.current = window.setTimeout(() => {
          setAlert(null)
          timerRef.current = null
        }, autoHideMs)
      }
    },
    [clearAlert, defaultTimeoutMs]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    alert,
    showAlert,
    clearAlert
  }
}
