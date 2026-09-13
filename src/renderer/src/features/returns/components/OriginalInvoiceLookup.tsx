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
      <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm">
            {returnType === 'SALES_RETURN' ? '🧾' : '📦'}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>{selectedInvoice.invoiceNumber}</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-mono">
                {selectedInvoice.invoiceDate}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
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
            className="text-xs px-2.5 py-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all font-semibold cursor-pointer"
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
          className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400 shadow-sm disabled:opacity-50"
          autoFocus
        />
        <div className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</div>
        {isLoading && (
          <div className="absolute right-3.5 top-3 text-[11px] text-slate-400">
            Searching...
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
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
                className={`w-full text-left px-4 py-3 text-sm border-b border-slate-100 last:border-none flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected ? 'bg-amber-50 border-l-2 border-l-amber-500' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900 font-mono flex items-center gap-2">
                    <span>{inv.invoiceNumber}</span>
                    <span className="text-[11px] font-normal text-slate-400">({inv.invoiceDate})</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    👤 {party} • Total: ₹{inv.grandTotal?.toLocaleString()}
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700">Select →</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
