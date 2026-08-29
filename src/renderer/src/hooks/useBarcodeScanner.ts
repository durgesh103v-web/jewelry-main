import { useEffect, useRef } from 'react'

export interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void
  enabled?: boolean
  minChars?: number
  maxIntervalMs?: number
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 3,
  maxIntervalMs = 50
}: UseBarcodeScannerOptions): void {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing into an active text input or textarea
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }

      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTimeRef.current

      if (timeDiff > maxIntervalMs) {
        bufferRef.current = ''
      }

      lastKeyTimeRef.current = currentTime

      if (event.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          onScan(bufferRef.current)
        }
        bufferRef.current = ''
      } else if (event.key.length === 1) {
        bufferRef.current += event.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, minChars, maxIntervalMs, onScan])
}
