import React, { useState, useEffect, useRef } from 'react'
import type { SupplierRecord } from '@shared/types/supplier'

interface SupplierSelectorProps {
  supplier: SupplierRecord | null
  onSelectSupplier: (supplier: SupplierRecord | null) => void
  disabled?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  supplier,
  onSelectSupplier,
  disabled = false,
  inputRef: externalRef
}) => {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SupplierRecord[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef || internalRef
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!search.trim() || supplier) {
      setResults([])
      setIsOpen(false)
      setSelectedIndex(0)
      return
    }

    let active = true
    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const list = await window.api.suppliers.list({ search })
        if (active) {
          setResults(list || [])
          setSelectedIndex(0)
          setIsOpen((list || []).length > 0)
        }
      } catch (err) {
        console.error('Failed to search suppliers:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, supplier])

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
        onSelectSupplier(results[selectedIndex])
        setSearch('')
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  if (supplier) {
    return (
      <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {supplier.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm flex items-center gap-2">
              <span>{supplier.name}</span>
              {supplier.supplierCode && (
                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                  {supplier.supplierCode}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
              {supplier.mobile && <span>📞 {supplier.mobile}</span>}
              {supplier.city && <span>📍 {supplier.city}</span>}
              {supplier.accountName && <span>🏢 {supplier.accountName}</span>}
            </div>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onSelectSupplier(null)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            className="text-xs px-2.5 py-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors font-medium"
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
          placeholder="Search Supplier by Name, Mobile, or Code (F2)..."
          disabled={disabled}
          className="w-full h-10 pl-9 pr-4 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
        />
        <div className="absolute left-3 top-2.5 text-muted-foreground">
          🏢
        </div>
        {isLoading && (
          <div className="absolute right-3 top-2.5 text-xs text-muted-foreground animate-pulse">
            Searching...
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((s, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelectSupplier(s)
                  setSearch('')
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-border/50 last:border-none flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent/50'
                }`}
              >
                <div>
                  <div className="font-medium text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                    {s.mobile && <span>{s.mobile}</span>}
                    {s.city && <span>• {s.city}</span>}
                  </div>
                </div>
                {s.supplierCode && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {s.supplierCode}
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
