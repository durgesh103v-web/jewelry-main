import React, { useState, useEffect, useRef, useMemo } from 'react'
import dayjs from 'dayjs'
import type { SupplierRecord } from '@shared/types/supplier'
import type {
  CreateConsignmentInwardPayload,
  CreateConsignmentItemLine
} from '@shared/types/consignment'
import { SupplierSelector } from '../../purchases/components/SupplierSelector'
import { ItemSearchModal } from '../../sales/components/ItemSearchModal'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

export interface ConsignmentInwardScreenProps {
  onClose?: () => void
  onSuccess?: (consignmentNumber: string) => void
  onViewMemo?: (memoId: string) => void
  onNavigate?: (id: string, label: string, module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility') => void
}

interface DraftItemLine extends CreateConsignmentItemLine {
  tempId: string
  itemName: string
  itemCode?: string
  metalType: string
}

const PURITY_OPTIONS = [
  { name: '24K', tunch: 99.9 },
  { name: '22K', tunch: 91.6 },
  { name: '18K', tunch: 75.0 },
  { name: '14K', tunch: 58.5 },
  { name: '9K', tunch: 37.5 },
  { name: 'Silver 999', tunch: 99.9 },
  { name: 'Silver 925', tunch: 92.5 },
  { name: 'Platinum 950', tunch: 95.0 }
]

export const ConsignmentInwardScreen: React.FC<ConsignmentInwardScreenProps> = ({
  onClose,
  onSuccess,
  onViewMemo,
  onNavigate
}) => {
  // 1. Memo Header State
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null)
  const [inwardDate, setInwardDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(
    dayjs().add(30, 'day').format('YYYY-MM-DD')
  )
  const [notes, setNotes] = useState<string>('')

  // 2. Items List State
  const [items, setItems] = useState<DraftItemLine[]>([])

  // 3. Line Entry Form State
  const [selectedItemMaster, setSelectedItemMaster] = useState<any | null>(null)
  const [vendorItemCode, setVendorItemCode] = useState<string>('')
  const [purityName, setPurityName] = useState<string>('22K')
  const [tunch, setTunch] = useState<number>(91.6)
  const [grossWeight, setGrossWeight] = useState<string>('')
  const [netWeight, setNetWeight] = useState<string>('')
  const [vendorCost, setVendorCost] = useState<string>('')
  const [retailPrice, setRetailPrice] = useState<string>('')
  const [counter, setCounter] = useState<string>('Showroom Counter 1')
  const [tray, setTray] = useState<string>('Tray A-1')
  const [itemNotes, setItemNotes] = useState<string>('')

  // 4. UI Feedback State
  const [isItemSearchOpen, setIsItemSearchOpen] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [itemError, setItemError] = useState<string | null>(null)
  const [successMemo, setSuccessMemo] = useState<{
    inwardId?: string
    consignmentNumber: string
    totalPieces: number
    totalGrossWeight: number
    totalVendorCost: number
  } | null>(null)

  // Element Refs for keyboard focus
  const supplierInputRef = useRef<HTMLInputElement>(null)
  const grossWeightInputRef = useRef<HTMLInputElement>(null)
  const vendorCostInputRef = useRef<HTMLInputElement>(null)

  // Keyboard Shortcuts (F2: Supplier, F4: Item Search, F8: Submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        supplierInputRef.current?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        setIsItemSearchOpen(true)
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (items.length > 0 && selectedSupplier && !isSubmitting) {
          void handleSubmitInward()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedSupplier, isSubmitting])

  // Automatically update Net Weight if Gross Weight changes and Net Weight is not manually customized
  const handleGrossWeightChange = (val: string) => {
    setGrossWeight(val)
    if (!netWeight || netWeight === grossWeight) {
      setNetWeight(val)
    }
  }

  // Handle Purity preset change
  const handlePurityChange = (presetName: string) => {
    setPurityName(presetName)
    const matched = PURITY_OPTIONS.find((p) => p.name === presetName)
    if (matched) {
      setTunch(matched.tunch)
    }
  }

  // Handle selection from Item Search Modal
  const handleSelectItem = (it: any) => {
    setSelectedItemMaster(it)
    setItemError(null)
    if (it.metalType === 'Silver') {
      setPurityName('Silver 925')
      setTunch(92.5)
    } else if (it.metalType === 'Gold') {
      setPurityName('22K')
      setTunch(91.6)
    }
    setTimeout(() => grossWeightInputRef.current?.focus(), 100)
  }

  // Add Item to Memo List
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setItemError(null)

    if (!selectedItemMaster) {
      setItemError('Please select a jewellery item from the master (Press F4).')
      return
    }

    const gWt = parseFloat(grossWeight)
    if (isNaN(gWt) || gWt <= 0) {
      setItemError('Gross weight must be greater than 0.')
      grossWeightInputRef.current?.focus()
      return
    }

    const nWt = parseFloat(netWeight) || gWt
    if (nWt > gWt) {
      setItemError('Net weight cannot exceed gross weight.')
      return
    }

    const vCost = parseFloat(vendorCost) || 0
    if (vCost <= 0) {
      setItemError('Vendor cost must be greater than 0 (agreed vendor payable if sold).')
      vendorCostInputRef.current?.focus()
      return
    }

    const rPrice = parseFloat(retailPrice) || 0
    const calculatedFine = Number(((nWt * tunch) / 100).toFixed(3))

    const newItem: DraftItemLine = {
      tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId: selectedItemMaster.itemId || selectedItemMaster.id,
      itemName: selectedItemMaster.itemName || selectedItemMaster.item_name || 'Jewellery Piece',
      itemCode: selectedItemMaster.itemCode || selectedItemMaster.item_code,
      metalType: selectedItemMaster.metalType || selectedItemMaster.metal_type || 'Gold',
      vendorItemCode: vendorItemCode.trim() || undefined,
      grossWeight: gWt,
      netWeight: nWt,
      fineWeight: calculatedFine,
      purityName,
      tunch,
      vendorCost: vCost,
      retailPrice: rPrice > 0 ? rPrice : undefined,
      counter: counter.trim() || undefined,
      tray: tray.trim() || undefined,
      notes: itemNotes.trim() || undefined
    }

    setItems((prev) => [...prev, newItem])

    // Reset line fields for next piece entry
    setGrossWeight('')
    setNetWeight('')
    setVendorCost('')
    setRetailPrice('')
    setVendorItemCode('')
    setItemNotes('')
    setFormError(null)

    // Re-focus gross weight for rapid piece scanning/entry
    setTimeout(() => grossWeightInputRef.current?.focus(), 50)
  }

  // Remove Item from Draft List
  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId))
  }

  // Summary Totals
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        totalPieces: acc.totalPieces + 1,
        totalGrossWeight: Number((acc.totalGrossWeight + item.grossWeight).toFixed(3)),
        totalNetWeight: Number((acc.totalNetWeight + item.netWeight).toFixed(3)),
        totalFineWeight: Number((acc.totalFineWeight + (item.fineWeight || 0)).toFixed(3)),
        totalVendorCost: Number((acc.totalVendorCost + item.vendorCost).toFixed(2)),
        totalRetailPrice: Number((acc.totalRetailPrice + (item.retailPrice || 0)).toFixed(2))
      }),
      {
        totalPieces: 0,
        totalGrossWeight: 0,
        totalNetWeight: 0,
        totalFineWeight: 0,
        totalVendorCost: 0,
        totalRetailPrice: 0
      }
    )
  }, [items])

  // Submit Inward Memo to Backend
  const handleSubmitInward = async () => {
    setFormError(null)

    if (!selectedSupplier) {
      setFormError('Please select a vendor / supplier before submitting.')
      supplierInputRef.current?.focus()
      return
    }

    if (items.length === 0) {
      setFormError('Please add at least one jewellery item to the consignment memo.')
      return
    }

    if (!inwardDate) {
      setFormError('Inward date is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateConsignmentInwardPayload = {
        supplierId: selectedSupplier.id,
        inwardDate,
        expectedReturnDate: expectedReturnDate || undefined,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          itemId: it.itemId,
          vendorItemCode: it.vendorItemCode,
          grossWeight: it.grossWeight,
          netWeight: it.netWeight,
          fineWeight: it.fineWeight,
          purityName: it.purityName,
          tunch: it.tunch,
          vendorCost: it.vendorCost,
          retailPrice: it.retailPrice,
          counter: it.counter,
          tray: it.tray,
          notes: it.notes
        }))
      }

      const result = await window.api.consignment.createInward(payload)

      setSuccessMemo({
        inwardId: result.id,
        consignmentNumber: result.consignmentNumber,
        totalPieces: totals.totalPieces,
        totalGrossWeight: totals.totalGrossWeight,
        totalVendorCost: totals.totalVendorCost
      })

      if (onSuccess) {
        onSuccess(result.consignmentNumber)
      }
    } catch (err: unknown) {
      console.error('Failed to create consignment inward:', err)
      setFormError(getFriendlyErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form for next memo
  const handleResetForAnother = () => {
    setSelectedSupplier(null)
    setItems([])
    setNotes('')
    setSuccessMemo(null)
    setFormError(null)
    setItemError(null)
    setInwardDate(dayjs().format('YYYY-MM-DD'))
    setExpectedReturnDate(dayjs().add(30, 'day').format('YYYY-MM-DD'))
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* 1. Screen Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-sm">
            📥
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              Vendor Consignment Inward Form
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
                Vendor Custody Only
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Intake vendor jewellery into showroom custody with barcode serialization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors border border-border"
            >
              Back to Hub
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSubmitInward()}
            disabled={isSubmitting || items.length === 0 || !selectedSupplier}
            className={`h-8 px-4 text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5 ${
              isSubmitting || items.length === 0 || !selectedSupplier
                ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-xs">⏳</span>
                <span>Saving Inward...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Inward Memo (F8)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Form Content */}
      <div className="flex-1 flex flex-col p-4 gap-3.5 overflow-hidden">
        {/* Error Banner */}
        {formError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex justify-between items-center shadow-sm shrink-0">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{formError}</span>
            </span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-destructive/20"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. Top Header Grid: Supplier & Memo Details */}
        <section className="bg-card p-3.5 rounded-xl border border-border shadow-sm shrink-0 grid grid-cols-12 gap-3 text-xs">
          {/* Supplier Selector (Col 1-5) */}
          <div className="col-span-5 flex flex-col justify-between">
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Vendor / Consignor (F2) <span className="text-destructive">*</span>
            </label>
            <SupplierSelector
              supplier={selectedSupplier}
              onSelectSupplier={setSelectedSupplier}
              inputRef={supplierInputRef}
              disabled={isSubmitting}
            />
          </div>

          {/* Inward Date (Col 6-7) */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Inward Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={inwardDate}
              onChange={(e) => setInwardDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-10 px-3 bg-background border border-input rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Expected Return Date (Col 8-9) */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Return Due Date
            </label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-10 px-3 bg-background border border-input rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              30 days default
            </span>
          </div>

          {/* Memo Notes / Terms (Col 10-12) */}
          <div className="col-span-3">
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Consignment Terms / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Exhibition consignment, 30-day approval"
              disabled={isSubmitting}
              className="w-full h-10 px-3 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </section>

        {/* 3. Item Entry Box */}
        <section className="bg-card p-3.5 rounded-xl border border-border shadow-sm shrink-0 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div className="font-bold text-xs text-foreground flex items-center gap-2">
              <span>💎 Add Jewellery Piece to Inward</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                (Press F4 to open item search modal)
              </span>
            </div>
            {itemError && (
              <span className="text-destructive font-semibold text-[11px] animate-pulse">
                ⚠️ {itemError}
              </span>
            )}
          </div>

          <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-2.5 pt-1 items-end">
            {/* Item Master Search Trigger (Col 1-3) */}
            <div className="col-span-3">
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                Item Design / Master (F4) <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsItemSearchOpen(true)}
                  className="flex-1 h-9 px-3 bg-background border border-input rounded-lg text-left text-xs text-foreground flex items-center justify-between hover:border-primary transition-colors focus:ring-1 focus:ring-primary"
                >
                  <span className="truncate font-semibold">
                    {selectedItemMaster
                      ? selectedItemMaster.itemName || selectedItemMaster.item_name
                      : 'Search item (F4)...'}
                  </span>
                  <span className="text-muted-foreground text-xs">🔍</span>
                </button>
              </div>
            </div>

            {/* Vendor Item Code (Col 4-5) */}
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                Vendor Tag Code
              </label>
              <input
                type="text"
                value={vendorItemCode}
                onChange={(e) => setVendorItemCode(e.target.value)}
                placeholder="e.g. V-BRAC-01"
                className="w-full h-9 px-2.5 bg-background border border-input rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Purity Preset & Tunch (Col 6-7) */}
            <div className="col-span-2 flex gap-1.5">
              <div className="w-2/3">
                <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                  Purity
                </label>
                <select
                  value={purityName}
                  onChange={(e) => handlePurityChange(e.target.value)}
                  className="w-full h-9 px-2 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                >
                  {PURITY_OPTIONS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-1/3">
                <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                  Tunch %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tunch}
                  onChange={(e) => setTunch(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-1 text-center bg-background border border-input rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Gross & Net Weight (Col 8-9) */}
            <div className="col-span-2 flex gap-1.5">
              <div className="w-1/2">
                <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                  Gross Wt (g) <span className="text-destructive">*</span>
                </label>
                <input
                  ref={grossWeightInputRef}
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={grossWeight}
                  onChange={(e) => handleGrossWeightChange(e.target.value)}
                  placeholder="0.000"
                  className="w-full h-9 px-2 text-right bg-background border border-input rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                  Net Wt (g)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  placeholder="0.000"
                  className="w-full h-9 px-2 text-right bg-background border border-input rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Vendor Cost (Col 10) */}
            <div className="col-span-1">
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                Vendor Cost ₹ <span className="text-destructive">*</span>
              </label>
              <input
                ref={vendorCostInputRef}
                type="number"
                step="1"
                min="1"
                value={vendorCost}
                onChange={(e) => setVendorCost(e.target.value)}
                placeholder="50000"
                className="w-full h-9 px-2 text-right bg-background border border-input rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Retail Tag Price (Col 11) */}
            <div className="col-span-1">
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                Retail Price ₹
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="75000"
                className="w-full h-9 px-2 text-right bg-background border border-input rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Add Button (Col 12) */}
            <div className="col-span-1">
              <button
                type="submit"
                className="w-full h-9 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-1 text-xs"
              >
                <span>+</span>
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Secondary placement options */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <span>Counter:</span>
              <input
                type="text"
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
                placeholder="Counter"
                className="h-6 px-2 bg-background border border-input rounded text-xs w-36 font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Tray:</span>
              <input
                type="text"
                value={tray}
                onChange={(e) => setTray(e.target.value)}
                placeholder="Tray"
                className="h-6 px-2 bg-background border border-input rounded text-xs w-28 font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span>Item Notes:</span>
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Optional notes for this piece (e.g. Certificate #)"
                className="h-6 px-2 bg-background border border-input rounded text-xs flex-1"
              />
            </div>
          </div>
        </section>

        {/* 4. Items Review Table */}
        <section className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm flex flex-col">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Item Design / Group</th>
                <th className="py-2.5 px-3">Vendor Code</th>
                <th className="py-2.5 px-2 text-center">Purity</th>
                <th className="py-2.5 px-3 text-right">Gross Wt</th>
                <th className="py-2.5 px-3 text-right">Net Wt</th>
                <th className="py-2.5 px-3 text-right">Fine Wt</th>
                <th className="py-2.5 px-3">Placement</th>
                <th className="py-2.5 px-3 text-right">Vendor Cost</th>
                <th className="py-2.5 px-3 text-right">Retail Price</th>
                <th className="py-2.5 px-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="text-3xl">📦</span>
                      <span className="font-semibold text-foreground text-sm">
                        No jewellery items added to this memo yet
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Use the entry panel above or press <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono border border-border text-[10px]">F4</kbd> to search and add pieces.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={it.tempId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-foreground">{it.itemName}</div>
                      {it.notes && (
                        <div className="text-[10px] text-muted-foreground italic">
                          {it.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">
                      {it.vendorItemCode || '-'}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-medium">
                      {it.purityName} ({it.tunch}%)
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {formatWeight(it.grossWeight)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {formatWeight(it.netWeight)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {formatWeight(it.fineWeight || 0)}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {it.counter || it.tray ? `${it.counter || ''} • ${it.tray || ''}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(it.vendorCost)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {it.retailPrice ? formatCurrency(it.retailPrice) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.tempId)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded flex items-center justify-center transition-colors"
                        title="Remove piece"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* 5. Bottom Totals Summary Strip */}
        <footer className="bg-card p-3 rounded-xl border border-border shadow-sm shrink-0 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground font-semibold">Total Pieces:</span>
              <span className="text-base font-bold font-mono text-foreground">
                {totals.totalPieces} Pcs
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground font-semibold">Total Gross Wt:</span>
              <span className="text-base font-bold font-mono text-foreground">
                {formatWeight(totals.totalGrossWeight)}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground font-semibold">Total Net Wt:</span>
              <span className="text-sm font-mono text-muted-foreground">
                {formatWeight(totals.totalNetWeight)}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground font-semibold">Total Fine Wt:</span>
              <span className="text-sm font-mono text-muted-foreground">
                {formatWeight(totals.totalFineWeight)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground font-semibold">Total Vendor Valuation:</span>
              <span className="text-base font-bold font-mono text-primary">
                {formatCurrency(totals.totalVendorCost)}
              </span>
            </div>

            {totals.totalRetailPrice > 0 && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground font-semibold">Total Retail Value:</span>
                <span className="text-sm font-mono text-muted-foreground">
                  {formatCurrency(totals.totalRetailPrice)}
                </span>
              </div>
            )}
          </div>
        </footer>
      </div>

      {/* 6. Item Search Modal (F4) */}
      <ItemSearchModal
        isOpen={isItemSearchOpen}
        onClose={() => setIsItemSearchOpen(false)}
        onSelectItem={handleSelectItem}
      />

      {/* 7. Success Confirmation Modal */}
      {successMemo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Consignment Inward Created!
                </h2>
                <p className="text-xs text-muted-foreground">
                  Physical stock items serialized &amp; barcodes generated
                </p>
              </div>
            </div>

            <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memo Number:</span>
                <span className="font-bold text-primary text-sm">
                  {successMemo.consignmentNumber}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor / Supplier:</span>
                <span className="font-semibold text-foreground">
                  {selectedSupplier?.name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Inward Date:</span>
                <span className="font-semibold text-foreground">
                  {formatDate(inwardDate)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Pieces:</span>
                <span className="font-bold text-foreground">
                  {successMemo.totalPieces} Pcs
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Gross Weight:</span>
                <span className="font-bold text-foreground">
                  {formatWeight(successMemo.totalGrossWeight)}
                </span>
              </div>

              <div className="flex justify-between border-t border-border/80 pt-1.5">
                <span className="text-muted-foreground">Vendor Agreed Cost:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(successMemo.totalVendorCost)}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[11px]">
              ℹ️ Items are now in showroom consignment custody (`CONSIGNMENT`). No purchase liability was recognized; liability will be automatically recognized upon sale at POS.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="h-8 px-3.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors"
              >
                Inward Another Memo
              </button>

              {onViewMemo && successMemo.inwardId && (
                <button
                  type="button"
                  onClick={() => onViewMemo(successMemo.inwardId!)}
                  className="h-8 px-3.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-semibold rounded-lg transition-colors"
                >
                  View Memo Details
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose()
                  else if (onNavigate) onNavigate('consignment-hub', 'Vendor Consignment & Memo Hub', 'transaction')
                }}
                className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                Go to Consignment Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConsignmentInwardScreen
