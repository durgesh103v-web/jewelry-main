import React, { useState, useEffect, useRef } from 'react'
import type { ReturnType } from '@shared/types/returnTransaction'

interface OriginalInvoiceLookupProps {
  returnType: ReturnType
  selectedInvoice: any | null
  onSelectInvoice: (invoice: any) => void
  disabled?: boolean
}

export const OriginalInvoiceLookup: React.FC<OriginalInvoiceLookupProps> = ({
  returnType,
  selectedInvoice,
  onSelectInvoice,
  disabled = false
}) => {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!search.trim() || selectedInvoice) {
      setResults([])
      setIsOpen(false)
      return
    }

    let active = true
    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        let list: any[] = []
        if (returnType === 'SALES_RETURN') {
          list = await window.api.salesInvoices.list({ search })
        } else {
          list = await window.api.purchaseInvoices.list({ search })
        }

        if (active) {
          setResults(list || [])
          setSelectedIndex(0)
          setIsOpen((list || []).length > 0)
        }
      } catch (err) {
        console.error('Failed to search invoices:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, selectedInvoice, returnType])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        onSelectInvoice(results[selectedIndex])
        setSearch('')
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  if (selectedInvoice) {
    const partyName =
      returnType === 'SALES_RETURN'
        ? selectedInvoice.customerName || selectedInvoice.accountName || 'Cash Customer'
        : selectedInvoice.supplierName || selectedInvoice.accountName || 'Supplier'

    return (
      <div className="flex items-center justify-between p-3.5 bg-card border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {returnType === 'SALES_RETURN' ? '🧾' : '📦'}
          </div>
          <div>
            <div className="font-bold text-foreground text-sm flex items-center gap-2">
              <span>{selectedInvoice.invoiceNumber}</span>
              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                {selectedInvoice.invoiceDate}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
              <span>👤 {partyName}</span>
              <span>💰 ₹{selectedInvoice.grandTotal?.toLocaleString()}</span>
              <span>📦 {selectedInvoice.totalPcs || selectedInvoice.items?.length || 0} pcs</span>
            </div>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onSelectInvoice(null)}
            className="text-xs px-2.5 py-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors font-medium"
          >
            Change Invoice
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Search original ${returnType === 'SALES_RETURN' ? 'Sales Invoice (SL-...)' : 'Purchase Invoice (PR-...)'} by number or party...`}
          disabled={disabled}
          className="w-full h-11 pl-10 pr-4 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground shadow-sm"
        />
        <div className="absolute left-3.5 top-3 text-muted-foreground">
          🔍
        </div>
        {isLoading && (
          <div className="absolute right-3.5 top-3 text-xs text-muted-foreground animate-pulse">
            Searching...
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {results.map((inv, idx) => {
            const isSelected = idx === selectedIndex
            const party =
              returnType === 'SALES_RETURN'
                ? inv.customerName || inv.accountName || 'Cash Customer'
                : inv.supplierName || inv.accountName || 'Supplier'

            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => {
                  onSelectInvoice(inv)
                  setSearch('')
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-3 text-sm border-b border-border/50 last:border-none flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent/50'
                }`}
              >
                <div>
                  <div className="font-bold text-foreground font-mono flex items-center gap-2">
                    <span>{inv.invoiceNumber}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">({inv.invoiceDate})</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    👤 {party} • Total: ₹{inv.grandTotal?.toLocaleString()}
                  </div>
                </div>
                <span className="text-xs font-semibold text-primary">
                  Select →
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
