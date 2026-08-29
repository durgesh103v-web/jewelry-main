import React, { useState, useRef, useEffect } from 'react'

interface BarcodeInputProps {
  onScanItem: (barcode: string) => Promise<boolean>
  onOpenSearch: () => void
  disabled?: boolean
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
  onScanItem,
  onOpenSearch,
  disabled = false
}) => {
  const [barcode, setBarcode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<{ message: string; isError?: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = barcode.trim()
    if (!trimmed || isScanning) return

    setIsScanning(true)
    setScanStatus({ message: 'Resolving barcode...' })
    try {
      const found = await onScanItem(trimmed)
      if (found) {
        setBarcode('')
        setScanStatus({ message: '✓ Item Added' })
        setTimeout(() => setScanStatus(null), 1500)
      } else {
        setScanStatus({ message: 'Item tag not found in inventory', isError: true })
        setTimeout(() => setScanStatus(null), 3000)
      }
    } catch (err) {
      setScanStatus({ message: 'Scan resolution failed', isError: true })
      setTimeout(() => setScanStatus(null), 3000)
    } finally {
      setIsScanning(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex items-center gap-2">
      <form onSubmit={handleSubmit} className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan Barcode / Enter Tag ID (Press Enter)..."
          disabled={disabled || isScanning}
          className="w-full h-10 pl-9 pr-32 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground font-mono"
        />
        <div className="absolute left-3 top-2.5 text-muted-foreground text-sm">
          🏷️
        </div>
        {scanStatus && (
          <span
            className={`absolute right-3 top-2.5 text-xs font-semibold ${
              scanStatus.isError
                ? 'text-destructive'
                : 'text-emerald-600 dark:text-emerald-400'
            } animate-pulse`}
          >
            {scanStatus.message}
          </span>
        )}
      </form>

      <button
        type="button"
        onClick={onOpenSearch}
        disabled={disabled}
        className="h-10 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
      >
        <span>🔍</span>
        <span>Item Search (F4)</span>
      </button>
    </div>
  )
}
