import React, { useState } from 'react'

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
  const [scanStatus, setScanStatus] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode.trim() || isScanning) return

    setIsScanning(true)
    setScanStatus('Scanning...')
    try {
      const found = await onScanItem(barcode.trim())
      if (found) {
        setBarcode('')
        setScanStatus(null)
      } else {
        setScanStatus('Item not found')
        setTimeout(() => setScanStatus(null), 2500)
      }
    } catch (err) {
      setScanStatus('Scan failed')
      setTimeout(() => setScanStatus(null), 2500)
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <form onSubmit={handleSubmit} className="flex-1 relative">
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan Barcode / Enter Tag ID..."
          disabled={disabled || isScanning}
          className="w-full h-10 pl-9 pr-24 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground font-mono"
        />
        <div className="absolute left-3 top-2.5 text-muted-foreground text-sm">
          🏷️
        </div>
        {scanStatus && (
          <span className="absolute right-3 top-2.5 text-xs text-amber-500 font-medium animate-pulse">
            {scanStatus}
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
