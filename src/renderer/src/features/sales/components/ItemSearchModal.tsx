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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Select Jewellery Item to Bill</h3>
              <p className="text-[11px] text-slate-500 font-medium">Browse master inventory catalog by name, tag, or barcode</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Item Name, Code, or Tag (e.g. Necklace, TAG-G101)..."
            className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-medium"
          />
        </div>

        {/* Item List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse font-semibold">
              Loading inventory catalog...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium">
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
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50/70 shadow-2xs'
                      : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span>{it.itemName || it.item_name}</span>
                      {it.barcode_value && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono font-semibold">
                          🏷️ {it.barcode_value}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex gap-3 font-medium">
                      <span className="text-amber-800 font-semibold">Metal: {it.metalType || it.metal_type}</span>
                      <span>Purity: {it.defaultTanch || it.default_tanch || 100}%</span>
                      <span>
                        Making: ₹{it.defaultLabourRate || it.default_labour_rate || 0}/
                        {it.labourRateType || it.labour_rate_type || 'g'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-bold shadow-2xs">
                      + Add Item
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Use <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑↓</kbd> to navigate, <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Enter</kbd> to select</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md font-bold cursor-pointer transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
