import React, { useState, useEffect, useRef } from 'react'
import type { CustomerRecord } from '@shared/types/customer'

interface CustomerSelectorProps {
  customer: CustomerRecord | null
  onSelectCustomer: (customer: CustomerRecord | null) => void
  disabled?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customer,
  onSelectCustomer,
  disabled = false,
  inputRef: externalRef
}) => {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<CustomerRecord[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef || internalRef
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!search.trim() || customer) {
      setResults([])
      setIsOpen(false)
      setSelectedIndex(0)
      return
    }

    let active = true
    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const list = await window.api.customers.list({ search })
        if (active) {
          setResults(list || [])
          setSelectedIndex(0)
          setIsOpen((list || []).length > 0)
        }
      } catch (err) {
        console.error('Failed to search customers:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, customer])

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
        onSelectCustomer(results[selectedIndex])
        setSearch('')
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  if (customer) {
    return (
      <div className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {customer.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">
              <span className="truncate">{customer.name}</span>
              {customer.customerCode && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono font-semibold shrink-0">
                  {customer.customerCode}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
              {customer.mobile && <span>📞 {customer.mobile}</span>}
              {customer.city && <span>📍 {customer.city}</span>}
            </div>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onSelectCustomer(null)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            className="text-[11px] px-2 py-1 text-slate-600 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors font-semibold cursor-pointer shrink-0"
          >
            Change (F2)
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search Customer by Name, Mobile, or Code (F2)..."
          disabled={disabled}
          className="w-full h-8 pl-8 pr-4 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-400 font-medium text-slate-800 transition-all shadow-2xs"
        />
        <div className="absolute left-2.5 top-2 text-slate-400 text-xs">
          🔍
        </div>
        {isLoading && (
          <div className="absolute right-2.5 top-2 text-[10px] text-amber-600 font-semibold animate-pulse">
            Searching...
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
          {results.map((c, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectCustomer(c)
                  setSearch('')
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected ? 'bg-amber-50 text-amber-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900">{c.name}</div>
                  <div className="text-[11px] text-slate-500 flex gap-2 mt-0.5">
                    {c.mobile && <span>📞 {c.mobile}</span>}
                    {c.city && <span>• {c.city}</span>}
                  </div>
                </div>
                {c.customerCode && (
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                    {c.customerCode}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
