import React, { useState, useEffect, useRef } from 'react'

interface ItemSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectItem: (item: any) => void
  metalType?: string
}

export const ItemSearchModal: React.FC<ItemSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  metalType = 'Gold'
}) => {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSelectedIndex(0)
      return
    }

    let active = true
    setIsLoading(true)

    const fetchItems = async () => {
      try {
        const list = await window.api.items.list()
        if (active) {
          const q = search.trim().toLowerCase()
          const filtered = (list || []).filter((it: any) => {
            const matchesSearch =
              !q ||
              (it.itemName || it.item_name || '').toLowerCase().includes(q) ||
              (it.itemCode || it.item_code || '').toLowerCase().includes(q)
            const matchesMetal =
              !metalType ||
              (it.metalType || it.metal_type || '').toLowerCase() === metalType.toLowerCase()
            return matchesSearch && matchesMetal
          })
          setItems(filtered)
          setSelectedIndex(0)
        }
      } catch (err) {
        console.error('Failed to load items:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchItems, 150)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [isOpen, search, metalType])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const selectItemAt = (it: any) => {
    onSelectItem({
      itemId: it.id,
      itemName: it.itemName || it.item_name,
      itemCode: it.itemCode || it.item_code,
      metalType: it.metalType || it.metal_type || metalType,
      stampId: it.defaultStampId || it.default_stamp_id,
      designId: it.defaultDesignId || it.default_design_id,
      grossWeight: it.fixedWeightPerPcs || it.fixed_weight_per_pcs || 1.0,
      tunch: it.defaultTanch || it.default_tanch || 100,
      wastage: it.defaultWastage || it.default_wastage || 0,
      labourRate: it.defaultLabourRate || it.default_labour_rate || 0,
      labourRateType: it.labourRateType || it.labour_rate_type || 'Kg'
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items.length > 0 && items[selectedIndex]) {
        selectItemAt(items[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <h3 className="font-semibold text-foreground text-sm">Select Jewellery Item to Bill</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-border bg-muted/20">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Item Name, Code, or Group (Use ↑↓ arrows and Enter)..."
            className="w-full h-9 px-3 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Item List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading inventory catalog...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No items matching search criteria.
            </div>
          ) : (
            items.map((it, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => selectItemAt(it)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">
                      {it.itemName || it.item_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                      <span>Metal: {it.metalType || it.metal_type}</span>
                      <span>Default Tunch: {it.defaultTanch || it.default_tanch || 100}%</span>
                      <span>
                        Making: ₹{it.defaultLabourRate || it.default_labour_rate || 0}/
                        {it.labourRateType || it.labour_rate_type || 'Kg'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {it.itemCode || it.item_code || 'ITEM'}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Use ↑↓ arrows to navigate, Enter to select</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md font-medium"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
