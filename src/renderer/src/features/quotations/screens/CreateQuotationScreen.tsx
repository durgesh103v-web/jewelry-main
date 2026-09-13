import React, { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import type { CustomerRecord } from '@shared/types/customer'
import type { QuotationRecord, QuotationDraftItem, LabourRateType } from '../types'
import { CustomerSelector } from '../../sales/components/CustomerSelector'
import { ItemSearchModal } from '../../sales/components/ItemSearchModal'
import { formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { MetalRatesStrip } from '../../../components/ui'

export interface CreateQuotationScreenProps {
  onBack: () => void
  onSuccess: (quotation: QuotationRecord) => void
}

export const CreateQuotationScreen: React.FC<CreateQuotationScreenProps> = ({
  onBack,
  onSuccess
}) => {
  const [quotationNumber, setQuotationNumber] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [quotationDate, setQuotationDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [validUntil, setValidUntil] = useState<string>(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [metalType, setMetalType] = useState<string>('Gold')
  const [notes, setNotes] = useState<string>('')
  const [currentGoldRate, setCurrentGoldRate] = useState<number>(0)

  // Items State
  const [items, setItems] = useState<QuotationDraftItem[]>([])
  const [barcodeInput, setBarcodeInput] = useState<string>('')
  const [isItemSearchOpen, setIsItemSearchOpen] = useState<boolean>(false)

  // Submission & Loading States
  const [isLoadingNumber, setIsLoadingNumber] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Double-click guard ref
  const submitLockRef = useRef<boolean>(false)

  // Fetch next quotation number & default metal rate
  useEffect(() => {
    let active = true
    const initData = async () => {
      setIsLoadingNumber(true)
      try {
        const nextNum = await window.api.quotations.getNextNumber()
        if (active) setQuotationNumber(nextNum)
      } catch (err) {
        console.error('Failed to get next quotation number:', err)
      } finally {
        if (active) setIsLoadingNumber(false)
      }

      try {
        const rateInfo = await window.api.goldRates.getCurrent(metalType)
        if (active && rateInfo) {
          const rateVal = typeof rateInfo === 'number' ? rateInfo : rateInfo.ratePerGram || rateInfo.rate || 0
          setCurrentGoldRate(rateVal)
        }
      } catch {
        // Non-fatal if rate isn't set yet
      }
    }

    void initData()
    return () => {
      active = false
    }
  }, [metalType])

  // Recalculate line item using backend pricing engine
  const calculateLineItem = useCallback(
    async (item: QuotationDraftItem, date: string): Promise<QuotationDraftItem> => {
      try {
        const priceResult = await window.api.pricing.calculate({
          metalType: item.metalType,
          purityName: item.purityName,
          tunch: item.tunch,
          wastage: item.wastage,
          pcs: item.pcs,
          grossWeight: item.grossWeight,
          packWeight: item.packWeight,
          lessWeight: item.lessWeight,
          addWeight: item.addWeight,
          labourRate: item.labourRate,
          labourRateType: item.labourRateType,
          ratePerGram: item.goldRate > 0 ? item.goldRate : undefined,
          rateDate: date,
          discountAmount: item.discountAmount,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent
        })

        return {
          ...item,
          netWeight: priceResult.weights.netWeight,
          fineWeight: priceResult.weights.fineWeight,
          metalValue: priceResult.metal.metalValue,
          makingCharges: priceResult.charges.making,
          taxAmount: priceResult.tax.taxAmount,
          lineTotal: priceResult.total.finalAmount,
          pricingBreakdown: priceResult.breakdown || [],
          isCalculating: false
        }
      } catch (err) {
        console.error('Error calculating line pricing:', err)
        return { ...item, isCalculating: false }
      }
    },
    []
  )

  // Add Item from Search Modal or Direct Selection
  const handleAddItem = async (itemMaster: any) => {
    setIsItemSearchOpen(false)
    const masterTunch = itemMaster.defaultTanch || itemMaster.default_tanch || 100
    const masterWastage = itemMaster.defaultWastage || itemMaster.default_wastage || 0
    const masterLabour = itemMaster.defaultLabourRate || itemMaster.default_labour_rate || 0
    const masterLabourType: LabourRateType = (itemMaster.labourRateType || itemMaster.labour_rate_type || 'Kg') as LabourRateType
    const itemMetal = itemMaster.metalType || itemMaster.metal_type || metalType

    const newItem: QuotationDraftItem = {
      tempId: `item_${Date.now()}_${Math.random()}`,
      itemId: itemMaster.id,
      itemName: itemMaster.itemName || itemMaster.item_name || 'Item',
      itemCode: itemMaster.itemCode || itemMaster.item_code || '',
      description: itemMaster.itemName || itemMaster.item_name || '',
      stampId: itemMaster.defaultStampId || itemMaster.default_stamp_id || '',
      designId: itemMaster.defaultDesignId || itemMaster.default_design_id || '',
      barcode: itemMaster.barcode || '',
      metalType: itemMetal,
      pcs: 1,
      grossWeight: 1,
      packWeight: 0,
      lessWeight: 0,
      addWeight: 0,
      netWeight: 1,
      fineWeight: 1,
      tunch: masterTunch,
      wastage: masterWastage,
      goldRate: currentGoldRate,
      labourRate: masterLabour,
      labourRateType: masterLabourType,
      stoneCharges: [],
      diamondCharges: [],
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 3,
      lineTotal: 0,
      taxAmount: 0,
      makingCharges: 0,
      metalValue: 0,
      pricingBreakdown: [],
      isCalculating: true
    }

    setItems((prev) => [...prev, newItem])

    // Calculate initial price
    const calculated = await calculateLineItem(newItem, quotationDate)
    setItems((prev) => prev.map((it) => (it.tempId === newItem.tempId ? calculated : it)))
  }

  // Barcode Lookup
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const bc = barcodeInput.trim()
    if (!bc) return

    try {
      const found = await window.api.items.getByBarcode(bc)
      if (found) {
        await handleAddItem(found)
        setBarcodeInput('')
      } else {
        setErrorMessage(`No inventory item found for barcode "${bc}"`)
      }
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err))
    }
  }

  // Update item field and trigger recalculation
  const handleItemChange = async (
    tempId: string,
    field: keyof QuotationDraftItem,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.tempId === tempId) {
          return { ...it, [field]: value, isCalculating: true }
        }
        return it
      })
    )

    const updated = items.find((it) => it.tempId === tempId)
    if (!updated) return

    const modified = { ...updated, [field]: value }
    const calculated = await calculateLineItem(modified, quotationDate)

    setItems((prev) => prev.map((it) => (it.tempId === tempId ? calculated : it)))
  }

  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId))
  }

  // Calculate totals across items
  const totals = items.reduce(
    (acc, it) => {
      acc.totalPcs += it.pcs
      acc.totalGrossWeight += it.grossWeight
      acc.totalNetWeight += it.netWeight
      acc.totalFineWeight += it.fineWeight
      acc.metalValue += it.metalValue
      acc.totalMaking += it.makingCharges
      acc.taxableAmount += it.metalValue + it.makingCharges - it.discountAmount
      acc.taxAmount += it.taxAmount
      acc.grandTotal += it.lineTotal
      return acc
    },
    {
      totalPcs: 0,
      totalGrossWeight: 0,
      totalNetWeight: 0,
      totalFineWeight: 0,
      metalValue: 0,
      totalMaking: 0,
      taxableAmount: 0,
      taxAmount: 0,
      grandTotal: 0
    }
  )

  // Submit Quotation
  const handleSubmit = async () => {
    if (submitLockRef.current || isSubmitting) return

    setErrorMessage(null)

    if (!selectedCustomer) {
      setErrorMessage('Please select a customer before saving the quotation.')
      return
    }

    const accountId = selectedCustomer.accountId || (selectedCustomer as any).account_id
    if (!accountId) {
      setErrorMessage('The selected customer does not have an associated financial account ID.')
      return
    }

    if (items.length === 0) {
      setErrorMessage('At least one item must be added to create a quotation.')
      return
    }

    // Validate weights
    for (let i = 0; i < items.length; i++) {
      if (items[i].grossWeight <= 0) {
        setErrorMessage(`Item #${i + 1} (${items[i].itemName}) has invalid gross weight (must be > 0).`)
        return
      }
    }

    submitLockRef.current = true
    setIsSubmitting(true)

    try {
      const payload = {
        quotationNumber: quotationNumber || undefined,
        customerId: selectedCustomer.id,
        accountId,
        quotationDate,
        validUntil,
        status: 'DRAFT' as const,
        metalType,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          itemId: it.itemId,
          description: it.description || it.itemName,
          stampId: it.stampId || undefined,
          designId: it.designId || undefined,
          barcode: it.barcode || undefined,
          pcs: it.pcs,
          grossWeight: it.grossWeight,
          packWeight: it.packWeight,
          lessWeight: it.lessWeight,
          addWeight: it.addWeight,
          metalType: it.metalType,
          purityName: it.purityName,
          tunch: it.tunch,
          wastage: it.wastage,
          goldRate: it.goldRate,
          labourRate: it.labourRate,
          labourRateType: it.labourRateType,
          stoneCharges: it.stoneCharges,
          diamondCharges: it.diamondCharges,
          discountAmount: it.discountAmount,
          discountPercent: it.discountPercent,
          taxPercent: it.taxPercent
        }))
      }

      const created = await window.api.quotations.create(payload)
      onSuccess(created)
    } catch (err) {
      console.error('Error saving quotation:', err)
      setErrorMessage(getFriendlyErrorMessage(err))
      submitLockRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* ── Top Header Bar ── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Return to Quotation Register"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Register</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Create Customer Quotation / Estimate
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
              {isLoadingNumber ? '...' : quotationNumber || 'NEW'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="h-8 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-300 shadow-2xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || items.length === 0 || !selectedCustomer}
            onClick={handleSubmit}
            className="h-8 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Saving Quotation...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Save & Create Quotation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Scrollable Page Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Showroom Rates Strip */}
        <MetalRatesStrip />

        {/* Header Configuration Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          {/* Customer Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer <span className="text-rose-500">*</span>
            </label>
            <CustomerSelector
              customer={selectedCustomer}
              onSelectCustomer={(c) => setSelectedCustomer(c)}
            />
          </div>

          {/* Quotation Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quotation Date
            </label>
            <input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
            />
          </div>

          {/* Valid Until */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Valid Until
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
            />
          </div>

          {/* Metal Type & Default Rate */}
          <div className="md:col-span-2 flex gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Metal Type
              </label>
              <div className="flex gap-1.5">
                {['Gold', 'Silver'].map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMetalType(mt)}
                    className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      metalType === mt
                        ? 'bg-amber-500 !text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Rate (₹/g)
              </label>
              <input
                type="number"
                step="any"
                value={currentGoldRate || ''}
                onChange={(e) => setCurrentGoldRate(Number(e.target.value) || 0)}
                placeholder="e.g. 7250"
                className="w-full h-8 px-2.5 text-xs font-mono font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quotation Notes / Terms
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rate valid for 3 days, 50% advance required on booking"
              className="w-full h-8 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
            />
          </div>
        </div>

        {/* Item Entry Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-700 flex items-center gap-1.5">
              <span>Quotation Items ({items.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              {/* Barcode Form */}
              <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan Tag / Barcode..."
                  className="h-8 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-lg w-44 focus:outline-none focus:border-amber-500 text-slate-800"
                />
                <button
                  type="submit"
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Scan
                </button>
              </form>

              {/* Search Catalog Button */}
              <button
                type="button"
                onClick={() => setIsItemSearchOpen(true)}
                className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Search Catalog</span>
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-tight">
                  <th className="p-3 text-center w-8">#</th>
                  <th className="p-3 min-w-[160px]">Item Description</th>
                  <th className="p-3 text-center w-16">Pcs</th>
                  <th className="p-3 text-right w-24">Gross (g)</th>
                  <th className="p-3 text-right w-20">Less (g)</th>
                  <th className="p-3 text-right w-20">Net (g)</th>
                  <th className="p-3 text-center w-20">Tunch %</th>
                  <th className="p-3 text-center w-16">Wast %</th>
                  <th className="p-3 text-right w-24">Rate (₹/g)</th>
                  <th className="p-3 text-right w-28">Making (₹)</th>
                  <th className="p-3 text-right w-28">Line Total (₹)</th>
                  <th className="p-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-12 text-center text-slate-500 font-medium">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-bold text-slate-900">No items added to quotation</p>
                        <p className="text-xs text-slate-500">
                          Click &quot;Search Catalog&quot; to browse inventory or scan an item barcode tag.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsItemSearchOpen(true)}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                          style={{ color: '#ffffff' }}
                        >
                          + Search Catalog
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.tempId} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={it.description || it.itemName}
                          onChange={(e) => handleItemChange(it.tempId, 'description', e.target.value)}
                          className="w-full h-7 px-1 text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none font-bold text-slate-900"
                        />
                        <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5 px-1 font-medium">
                          <span className="text-amber-800 font-semibold">{it.metalType}</span>
                          {it.barcode && <span>🏷️ {it.barcode}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={it.pcs}
                          onChange={(e) => handleItemChange(it.tempId, 'pcs', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 h-7 text-center text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={it.grossWeight}
                          onChange={(e) => handleItemChange(it.tempId, 'grossWeight', parseFloat(e.target.value) || 0)}
                          className="w-20 h-7 text-right px-1 text-xs font-mono font-bold bg-amber-50/50 border border-amber-300 rounded focus:bg-white focus:border-amber-500 text-slate-900"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={it.lessWeight}
                          onChange={(e) => handleItemChange(it.tempId, 'lessWeight', parseFloat(e.target.value) || 0)}
                          className="w-14 h-7 text-right px-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500 text-slate-600"
                        />
                      </td>
                      <td className="p-3 text-right font-mono text-xs font-extrabold text-slate-900">
                        {formatWeight(it.netWeight)}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={it.tunch}
                          onChange={(e) => handleItemChange(it.tempId, 'tunch', parseFloat(e.target.value) || 0)}
                          className="w-14 h-7 text-center text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={it.wastage}
                          onChange={(e) => handleItemChange(it.tempId, 'wastage', parseFloat(e.target.value) || 0)}
                          className="w-12 h-7 text-center text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="1"
                          value={it.goldRate || ''}
                          onChange={(e) => handleItemChange(it.tempId, 'goldRate', parseFloat(e.target.value) || 0)}
                          placeholder="Rate"
                          className="w-20 h-7 text-right px-1 text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500 text-slate-800"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="1"
                          value={it.labourRate}
                          onChange={(e) => handleItemChange(it.tempId, 'labourRate', parseFloat(e.target.value) || 0)}
                          className="w-16 h-7 text-right px-1 text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500 text-slate-800"
                        />
                        <div className="text-[10px] text-slate-500 text-right mt-0.5 font-mono font-bold">
                          ₹{it.makingCharges.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-amber-900 text-xs">
                        {it.isCalculating ? (
                          <span className="text-slate-400 animate-pulse">...</span>
                        ) : (
                          `₹${it.lineTotal.toLocaleString()}`
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.tempId)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded p-1 cursor-pointer transition-colors"
                          title="Remove Line"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary Footer Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 text-xs shadow-2xs">
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">
              Total Pieces & Weights
            </span>
            <p className="font-extrabold text-sm mt-1 text-slate-900">
              {totals.totalPcs} pcs | {formatWeight(totals.totalGrossWeight)}g Gross
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Net Wt: {formatWeight(totals.totalNetWeight)}g | Fine: {formatWeight(totals.totalFineWeight)}g
            </p>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">
              Metal & Labour Breakdown
            </span>
            <p className="font-mono text-sm mt-1 text-slate-900 font-bold">
              Metal Value: ₹{totals.metalValue.toLocaleString()}
            </p>
            <p className="font-mono text-xs text-slate-500 mt-0.5 font-medium">
              Making Charges: ₹{totals.totalMaking.toLocaleString()}
            </p>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">
              Taxable & GST Breakdown
            </span>
            <p className="font-mono text-sm mt-1 text-slate-900 font-bold">
              Taxable Amount: ₹{totals.taxableAmount.toLocaleString()}
            </p>
            <p className="font-mono text-xs text-slate-500 mt-0.5 font-medium">
              Estimated GST (3%): ₹{totals.taxAmount.toLocaleString()}
            </p>
          </div>

          <div className="text-right flex flex-col justify-center bg-amber-50 p-3 rounded-xl border border-amber-200">
            <span className="text-amber-800 block text-[10px] font-extrabold uppercase tracking-wider">
              ESTIMATED GRAND TOTAL
            </span>
            <p className="text-xl font-black text-amber-900 font-mono mt-0.5">
              ₹{Math.round(totals.grandTotal).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Actions Bar ── */}
      <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            ← Back to Register
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setItems([])}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear All Items
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isSubmitting || items.length === 0 || !selectedCustomer}
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Saving Quotation...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Save & Create Quotation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reusable Item Search Modal */}
      <ItemSearchModal
        isOpen={isItemSearchOpen}
        onClose={() => setIsItemSearchOpen(false)}
        onSelectItem={handleAddItem}
        metalType={metalType}
      />
    </div>
  )
}
