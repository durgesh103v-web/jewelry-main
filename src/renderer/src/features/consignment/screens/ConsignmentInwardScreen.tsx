import React, { useState, useEffect, useRef, useMemo } from 'react'
import dayjs from 'dayjs'
import {
  FiArrowLeft,
  FiSave,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiTag,
  FiCheckCircle,
  FiPrinter,
  FiBox,
  FiTrendingUp
} from 'react-icons/fi'
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

  // Select item from F4 Search Modal
  const handleSelectItem = (item: any) => {
    setSelectedItemMaster(item)
    setIsItemSearchOpen(false)
    if (item.purity) {
      setPurityName(item.purity)
      const matched = PURITY_OPTIONS.find((p) => p.name === item.purity)
      if (matched) setTunch(matched.tunch)
    }
    setTimeout(() => grossWeightInputRef.current?.focus(), 50)
  }

  // Handle purity change to auto-set tunch
  const handlePurityChange = (selectedPurity: string) => {
    setPurityName(selectedPurity)
    const found = PURITY_OPTIONS.find((p) => p.name === selectedPurity)
    if (found) {
      setTunch(found.tunch)
    }
  }

  // Auto-sync gross and net weight if net weight hasn't been explicitly typed
  const handleGrossWeightChange = (val: string) => {
    setGrossWeight(val)
    if (!netWeight || netWeight === grossWeight) {
      setNetWeight(val)
    }
  }

  // Preset return days helpers — available for quick-set buttons
  const setReturnPreset = (days: number) => {
    setExpectedReturnDate(dayjs(inwardDate).add(days, 'day').format('YYYY-MM-DD'))
  }
  void setReturnPreset // suppress unused warning; used by optional quick-set UI

  // Computed Live Fine weight for currently typed line
  const liveLineFineWeight = useMemo(() => {
    const nw = parseFloat(netWeight) || parseFloat(grossWeight) || 0
    return Number(((nw * tunch) / 100).toFixed(3))
  }, [netWeight, grossWeight, tunch])

  // Computed Live Margin %
  const liveMarginPercent = useMemo(() => {
    const cost = parseFloat(vendorCost) || 0
    const retail = parseFloat(retailPrice) || 0
    if (cost > 0 && retail > cost) {
      return Math.round(((retail - cost) / retail) * 100)
    }
    return null
  }, [vendorCost, retailPrice])

  // Add Item to Draft Line Items
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setItemError(null)

    if (!selectedItemMaster) {
      setItemError('Please select a master jewellery item (Press F4).')
      setIsItemSearchOpen(true)
      return
    }

    const gWeight = parseFloat(grossWeight)
    if (isNaN(gWeight) || gWeight <= 0) {
      setItemError('Gross weight must be greater than 0.')
      grossWeightInputRef.current?.focus()
      return
    }

    const nWeight = parseFloat(netWeight) || gWeight
    if (nWeight <= 0 || nWeight > gWeight) {
      setItemError('Net weight cannot be zero or exceed gross weight.')
      return
    }

    const vCost = parseFloat(vendorCost)
    if (isNaN(vCost) || vCost <= 0) {
      setItemError('Agreed vendor cost is required.')
      vendorCostInputRef.current?.focus()
      return
    }

    const rPrice = parseFloat(retailPrice) || 0
    const calculatedFine = Number(((nWeight * tunch) / 100).toFixed(3))

    const newItem: DraftItemLine = {
      tempId: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      itemId: selectedItemMaster.id,
      itemName: selectedItemMaster.itemName || selectedItemMaster.item_name || 'Jewellery Item',
      itemCode: selectedItemMaster.itemCode || selectedItemMaster.item_code,
      metalType: selectedItemMaster.metalType || selectedItemMaster.metal_type || 'GOLD',
      vendorItemCode: vendorItemCode.trim() || undefined,
      grossWeight: gWeight,
      netWeight: nWeight,
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

  const estimatedProfit = Math.max(0, totals.totalRetailPrice - totals.totalVendorCost)
  const estimatedProfitMargin =
    totals.totalRetailPrice > 0
      ? Math.round((estimatedProfit / totals.totalRetailPrice) * 100)
      : 0

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

      const created = await window.api.consignment.createInward(payload)

      setSuccessMemo({
        inwardId: created.id,
        consignmentNumber: created.consignmentNumber,
        totalPieces: created.totalPieces,
        totalGrossWeight: created.totalGrossWeight,
        totalVendorCost: created.totalVendorCost
      })

      if (onSuccess) {
        onSuccess(created.consignmentNumber)
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
    setSelectedItemMaster(null)
    setInwardDate(dayjs().format('YYYY-MM-DD'))
    setExpectedReturnDate(dayjs().add(30, 'day').format('YYYY-MM-DD'))
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* ── 1. SCREEN HEADER BAR ── */}
      <header className="px-6 py-3 border-b border-slate-200/90 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-center font-bold shadow-2xs">
            <FiBox size={18} className="text-amber-700 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Vendor Consignment Inward Form
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold tracking-wide">
                VENDOR CUSTODY ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Intake vendor exhibition &amp; approval jewellery into showroom custody with barcode serialization
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleResetForAnother}
              className="h-9 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.97] text-slate-600 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reset Memo Form"
            >
              <FiRotateCcw size={13} className="text-slate-400" />
              <span>Reset</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.97] text-slate-600 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FiArrowLeft size={13} className="text-slate-400" />
              <span>Back to Hub</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSubmitInward()}
            disabled={isSubmitting || items.length === 0 || !selectedSupplier}
            className={`
              relative inline-flex items-center gap-2 h-9 px-5 rounded-xl text-xs font-bold
              tracking-wide transition-all duration-150 select-none
              ${isSubmitting || items.length === 0 || !selectedSupplier
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : 'bg-amber-600 hover:bg-amber-700 active:scale-[0.97] text-white border border-amber-700/30 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/25 cursor-pointer'
              }
            `}
            style={{ color: isSubmitting || items.length === 0 || !selectedSupplier ? undefined : '#ffffff' }}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                <span>Saving Inward...</span>
              </>
            ) : (
              <>
                <FiSave size={13} className="shrink-0" />
                <span>
                  Save Inward Memo
               
                  {items.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-px bg-white/20 rounded text-[10px] font-bold">
                      {items.length} Pcs
                    </span>
                  )}
                </span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <main className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {/* Error Alert Banner */}
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs shrink-0 animate-in fade-in duration-150">
            <span className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span>{formError}</span>
            </span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── 2. TOP MEMO HEADER CARD ── */}
        <section className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs shrink-0 grid grid-cols-12 gap-3 text-xs">
          {/* Supplier / Vendor Selector (Col 1-5) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col justify-between">
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Vendor / Consignor <span className="text-rose-600">*</span></span>
              {selectedSupplier && (
                <span className="text-[10px] text-amber-700 font-semibold">
                  GST: {selectedSupplier.gstin || 'Unregistered'}
                </span>
              )}
            </label>
            <SupplierSelector
              supplier={selectedSupplier}
              onSelectSupplier={setSelectedSupplier}
              inputRef={supplierInputRef}
              disabled={isSubmitting}
            />
          </div>

          {/* Inward Date (Col 6-7) */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
           
              <span>Inward Date <span className="text-rose-600">*</span></span>
            </label>
            <input
              type="date"
              value={inwardDate}
              onChange={(e) => setInwardDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            />
          </div>

          {/* Expected Return Date (Col 8-9) */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Return Due Date</span>
              <span className="text-[10px] text-slate-400 font-medium">Approval</span>
            </label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            />
            {/* Quick Return Day Chips */}
         
          </div>

          {/* Consignment Terms / Remarks (Col 10-12) */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
             
              <span>Consignment Terms / Remarks</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Exhibition consignment, 30-day approval"
              disabled={isSubmitting}
              className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </section>

        {/* ── 3. ADD JEWELLERY PIECE ENTRY BOX ── */}
        <section className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs shrink-0 flex flex-col gap-2 text-xs relative overflow-hidden">
          {/* Subtle Top Amber Highlight */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <span className="text-amber-700">💎</span>
              <span>Add Jewellery Piece to Inward</span>
             
            </div>
            {itemError && (
              <span className="text-rose-600 font-bold text-[11px] animate-pulse flex items-center gap-1">
                <span>⚠️</span>
                <span>{itemError}</span>
              </span>
            )}
          </div>

          <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-2 pt-1 items-end">
            {/* Item Master Search Trigger (Col 1-3) */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <span>Item Design / Master (F4)</span>
                <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsItemSearchOpen(true)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-left text-xs text-slate-900 flex items-center justify-between hover:border-amber-500 transition-colors focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer shadow-2xs group"
              >
                <span className="truncate font-semibold group-hover:text-amber-900">
                  {selectedItemMaster
                    ? selectedItemMaster.itemName || selectedItemMaster.item_name
                    : 'Search item (F4)...'}
                </span>
                <FiSearch size={14} className="text-slate-400 group-hover:text-amber-600 shrink-0 ml-1" />
              </button>
            </div>

            {/* Vendor Tag Code (Col 4-5) */}
            <div className="col-span-6 sm:col-span-3 lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FiTag size={11} className="text-slate-400" />
                <span>Vendor Tag Code</span>
              </label>
              <input
                type="text"
                value={vendorItemCode}
                onChange={(e) => setVendorItemCode(e.target.value)}
                placeholder="e.g. V-BRAC-01"
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Purity & Tunch (Col 6-7) */}
            <div className="col-span-6 sm:col-span-5 lg:col-span-2 flex gap-1.5">
              <div className="w-2/3">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Purity
                </label>
                <select
                  value={purityName}
                  onChange={(e) => handlePurityChange(e.target.value)}
                  className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold text-slate-800"
                >
                  {PURITY_OPTIONS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-1/3">
                <label className="block text-[10px] font-bold text-slate-700 mb-1 text-center">
                  Tunch %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tunch}
                  onChange={(e) => setTunch(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-1 text-center bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Gross & Net Weight (Col 8-9) */}
            <div className="col-span-6 sm:col-span-4 lg:col-span-2 flex gap-1.5">
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Gross Wt (g) <span className="text-rose-600">*</span>
                </label>
                <input
                  ref={grossWeightInputRef}
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={grossWeight}
                  onChange={(e) => handleGrossWeightChange(e.target.value)}
                  placeholder="0.000"
                  className="w-full h-9 px-2 text-right bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Net Wt (g)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  placeholder="0.000"
                  className="w-full h-9 px-2 text-right bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Agreed Vendor Cost (Col 10) */}
            <div className="col-span-6 sm:col-span-4 lg:col-span-1">
              <label className="block text-[10px] font-bold text-slate-700 mb-1 truncate">
                Vendor Cost ₹ <span className="text-rose-600">*</span>
              </label>
              <input
                ref={vendorCostInputRef}
                type="number"
                step="1"
                min="1"
                value={vendorCost}
                onChange={(e) => setVendorCost(e.target.value)}
                placeholder="50000"
                className="w-full h-9 px-2 text-right bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>

            {/* Suggested Retail Price (Col 11) */}
            <div className="col-span-6 sm:col-span-4 lg:col-span-1">
              <label className="block text-[10px] font-bold text-slate-700 mb-1 truncate">
                Retail Price ₹
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="75000"
                className="w-full h-9 px-2 text-right bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>

            {/* Add Button (Col 12) */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-1">
              <button
                type="submit"
                className="w-full h-9 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.97] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/25 border border-amber-700/20 transition-all duration-150 cursor-pointer"
              >
                <span className="text-base leading-none ">+</span>
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Secondary placement & calculation live summary */}
          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Counter:</span>
                <input
                  type="text"
                  value={counter}
                  onChange={(e) => setCounter(e.target.value)}
                  placeholder="Counter"
                  className="h-6 px-2 bg-white border border-slate-200 rounded text-xs w-36 font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Tray:</span>
                <input
                  type="text"
                  value={tray}
                  onChange={(e) => setTray(e.target.value)}
                  placeholder="Tray"
                  className="h-6 px-2 bg-white border border-slate-200 rounded text-xs w-24 font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Notes:</span>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Piece remarks (e.g. Cert #)"
                  className="h-6 px-2 bg-white border border-slate-200 rounded text-xs w-52 text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Live Calculation Badges */}
            <div className="flex items-center gap-2">
              {liveLineFineWeight > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold text-[10px]">
                  Fine Wt: {liveLineFineWeight}g
                </span>
              )}
              {liveMarginPercent !== null && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                  <FiTrendingUp size={11} />
                  <span>Margin: {liveMarginPercent}%</span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── 4. ITEMS REVIEW TABLE ── */}
        <div className="flex-1 flex flex-col min-h-0 border border-slate-200/90 rounded-xl bg-white shadow-2xs overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Item Design / Master</th>
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
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shadow-2xs">
                          📦
                        </div>
                        <span className="font-bold text-slate-900 text-sm">
                          No jewellery items added to this memo yet
                        </span>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Use the entry panel above or press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] font-bold text-slate-800">F4</kbd> to search and select pieces from your master catalogue.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const lineProfit = it.retailPrice ? it.retailPrice - it.vendorCost : 0
                    return (
                      <tr key={it.tempId} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{it.itemName}</div>
                          {it.notes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              {it.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {it.vendorItemCode ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono font-semibold text-slate-800 text-[11px]">
                              {it.vendorItemCode}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[10px]">
                            {it.purityName} ({it.tunch}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatWeight(it.grossWeight)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatWeight(it.netWeight)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-900">
                          {formatWeight(it.fineWeight || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {it.counter || it.tray ? (
                            <span className="font-medium text-slate-700">
                              {it.counter || ''} {it.tray ? `• ${it.tray}` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.vendorCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          {it.retailPrice ? (
                            <div>
                              <span className="text-slate-900">{formatCurrency(it.retailPrice)}</span>
                              {lineProfit > 0 && (
                                <span className="block text-[10px] text-emerald-700">
                                  +{formatCurrency(lineProfit)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.tempId)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer mx-auto"
                            title="Remove piece"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 5. BOTTOM TOTALS SUMMARY STRIP ── */}
        <footer className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-between text-xs flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Pieces:</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {totals.totalPieces} Pcs
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-baseline gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Gross Wt:</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatWeight(totals.totalGrossWeight)}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-baseline gap-1.5 hidden sm:flex">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Net Wt:</span>
              <span className="text-sm font-semibold text-slate-700 font-mono">
                {formatWeight(totals.totalNetWeight)}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-baseline gap-1.5 hidden sm:flex">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Fine Wt:</span>
              <span className="text-sm font-bold text-amber-900 font-mono">
                {formatWeight(totals.totalFineWeight)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Vendor Valuation:</span>
              <span className="text-lg font-black text-amber-700 font-mono">
                {formatCurrency(totals.totalVendorCost)}
              </span>
            </div>

            {totals.totalRetailPrice > 0 && (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Retail Value:</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">
                    {formatCurrency(totals.totalRetailPrice)}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 ml-1">
                    ({estimatedProfitMargin}% Margin)
                  </span>
                </div>
              </>
            )}
          </div>
        </footer>
      </main>

      {/* ── 6. ITEM SEARCH MODAL (F4) ── */}
      <ItemSearchModal
        isOpen={isItemSearchOpen}
        onClose={() => setIsItemSearchOpen(false)}
        onSelectItem={handleSelectItem}
      />

      {/* ── 7. SUCCESS CONFIRMATION MODAL ── */}
      {successMemo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-200 shadow-xs">
                <FiCheckCircle size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Consignment Inward Memo Created!
                </h2>
                <p className="text-xs text-slate-500">
                  Stock serialized into custody with auto-generated barcode tracking
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Inward Memo #:</span>
                <span className="font-bold text-slate-900 font-mono text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
                  {successMemo.consignmentNumber}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Vendor / Supplier:</span>
                <span className="font-bold text-slate-800">
                  {selectedSupplier?.name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Inward Date:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(inwardDate)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Pieces:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {successMemo.totalPieces} Pcs
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Gross Weight:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatWeight(successMemo.totalGrossWeight)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200/80 pt-2">
                <span className="text-slate-600 font-semibold">Vendor Agreed Valuation:</span>
                <span className="font-black text-emerald-700 font-mono text-sm">
                  {formatCurrency(successMemo.totalVendorCost)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 text-blue-900 rounded-xl text-[11px] font-medium leading-relaxed">
              ℹ️ <strong>Custody Stock Policy:</strong> Items are now available in showroom inventory tags. No purchase ledger liability is recognized until individual piece sale at POS.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="h-9 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Inward Another Memo
              </button>

              {onViewMemo && successMemo.inwardId && (
                <button
                  type="button"
                  onClick={() => onViewMemo(successMemo.inwardId!)}
                  className="h-9 px-3.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FiPrinter size={13} />
                  <span>View &amp; Print Memo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose()
                  else if (onNavigate) onNavigate('consignment-hub', 'Vendor Consignment & Memo Hub', 'transaction')
                }}
                className="h-9 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-xl shadow-2xs cursor-pointer transition-all"
                style={{ color: '#ffffff' }}
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
