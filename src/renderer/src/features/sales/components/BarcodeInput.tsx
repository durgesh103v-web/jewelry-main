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
    <div className="flex items-center gap-2.5">
      <form onSubmit={handleSubmit} className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan Barcode / Enter Tag ID (e.g. TAG-G101) & press Enter..."
          disabled={disabled || isScanning}
          className="w-full h-9 pl-9 pr-32 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-400 font-mono text-slate-800 transition-all shadow-2xs"
        />
        <div className="absolute left-3 top-2 text-slate-400 text-xs">
          🏷️
        </div>
        {scanStatus && (
          <span
            className={`absolute right-3 top-2 text-[11px] font-bold ${
              scanStatus.isError
                ? 'text-rose-600'
                : 'text-emerald-600'
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
        className="h-9 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
      >
        <span>🔍</span>
        <span>Item Search (F4)</span>
      </button>
    </div>
  )
}
