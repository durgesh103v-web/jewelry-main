import React, { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import type { CustomerRecord } from '@shared/types/customer'
import type { QuotationRecord, QuotationDraftItem, LabourRateType } from '../types'
import { CustomerSelector } from '../../sales/components/CustomerSelector'
import { ItemSearchModal } from '../../sales/components/ItemSearchModal'
import { formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

interface NewQuotationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (quotation: QuotationRecord) => void
}

export const NewQuotationModal: React.FC<NewQuotationModalProps> = ({
  isOpen,
  onClose,
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
    if (!isOpen) {
      setItems([])
      setSelectedCustomer(null)
      setNotes('')
      setErrorMessage(null)
      submitLockRef.current = false
      return
    }

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
  }, [isOpen, metalType])

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

    // Debounced or direct async calculation
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
      onClose()
    } catch (err) {
      console.error('Error saving quotation:', err)
      setErrorMessage(getFriendlyErrorMessage(err))
      submitLockRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background text-foreground max-w-6xl w-full max-h-[95vh] flex flex-col rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Create Customer Quotation / Estimate</h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
                {isLoadingNumber ? '...' : quotationNumber || 'NEW'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Draft a quotation with live pricing, purity calculation, and GST breakdown
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none p-1 rounded-md hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg text-xs flex justify-between items-center">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Customer & Quotation Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-card">
            {/* Customer Selector */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Customer <span className="text-rose-500">*</span>
              </label>
              <CustomerSelector
                customer={selectedCustomer}
                onSelectCustomer={(c) => setSelectedCustomer(c)}
              />
            </div>

            {/* Quotation Date */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Quotation Date
              </label>
              <input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Metal Type & Default Rate */}
            <div className="md:col-span-2 flex gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Metal Type
                </label>
                <div className="flex gap-2">
                  {['Gold', 'Silver'].map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setMetalType(mt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        metalType === mt
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border hover:bg-accent text-muted-foreground'
                      }`}
                    >
                      {mt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Default Rate (₹/g)
                </label>
                <input
                  type="number"
                  step="any"
                  value={currentGoldRate || ''}
                  onChange={(e) => setCurrentGoldRate(Number(e.target.value) || 0)}
                  placeholder="e.g. 7200"
                  className="w-full h-9 px-3 text-xs font-mono bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Quotation Notes / Terms
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Rate valid for 7 days, 50% advance required for custom work"
                className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Item Entry Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-foreground">
                Quotation Items ({items.length})
              </h3>
              <div className="flex items-center gap-2">
                {/* Barcode Form */}
                <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan Barcode / SKU..."
                    className="h-8 px-2.5 text-xs font-mono bg-background border border-input rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Scan
                  </button>
                </form>

                {/* Search Catalog Button */}
                <button
                  type="button"
                  onClick={() => setIsItemSearchOpen(true)}
                  className="h-8 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Catalog
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5 min-w-[140px]">Item</th>
                    <th className="p-2.5 text-center w-16">Pcs</th>
                    <th className="p-2.5 text-right w-24">Gross (g)</th>
                    <th className="p-2.5 text-right w-20">Less (g)</th>
                    <th className="p-2.5 text-right w-20">Net (g)</th>
                    <th className="p-2.5 text-center w-20">Tunch %</th>
                    <th className="p-2.5 text-center w-16">Wast %</th>
                    <th className="p-2.5 text-right w-24">Rate (₹/g)</th>
                    <th className="p-2.5 text-right w-28">Making (₹)</th>
                    <th className="p-2.5 text-right w-24">Total (₹)</th>
                    <th className="p-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-muted-foreground italic">
                        No items added yet. Click &quot;Search Catalog&quot; or scan a barcode to add quotation lines.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={it.tempId} className="hover:bg-accent/30 transition-colors">
                        <td className="p-2.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={it.description || it.itemName}
                            onChange={(e) => handleItemChange(it.tempId, 'description', e.target.value)}
                            className="w-full h-7 px-1.5 text-xs bg-transparent border-b border-transparent hover:border-input focus:border-primary focus:outline-none font-semibold text-foreground"
                          />
                          <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5 px-1.5">
                            <span>{it.metalType}</span>
                            {it.barcode && <span>BC: {it.barcode}</span>}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.pcs}
                            onChange={(e) => handleItemChange(it.tempId, 'pcs', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-14 h-7 text-center text-xs font-mono bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={it.grossWeight}
                            onChange={(e) => handleItemChange(it.tempId, 'grossWeight', parseFloat(e.target.value) || 0)}
                            className="w-20 h-7 text-right text-xs font-mono bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={it.lessWeight}
                            onChange={(e) => handleItemChange(it.tempId, 'lessWeight', parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-right text-xs font-mono bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs font-medium text-foreground">
                          {formatWeight(it.netWeight)}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={it.tunch}
                            onChange={(e) => handleItemChange(it.tempId, 'tunch', parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-center text-xs font-mono bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={it.wastage}
                            onChange={(e) => handleItemChange(it.tempId, 'wastage', parseFloat(e.target.value) || 0)}
                            className="w-14 h-7 text-center text-xs font-mono bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="1"
                            value={it.goldRate || ''}
                            onChange={(e) => handleItemChange(it.tempId, 'goldRate', parseFloat(e.target.value) || 0)}
                            placeholder="Rate"
                            className="w-20 h-7 text-right text-xs font-mono bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="1"
                            value={it.labourRate}
                            onChange={(e) => handleItemChange(it.tempId, 'labourRate', parseFloat(e.target.value) || 0)}
                            className="w-20 h-7 text-right text-xs font-mono bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="text-[10px] text-muted-foreground text-right mt-0.5 font-mono">
                            {formatCurrency(it.makingCharges, false)}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                          {it.isCalculating ? (
                            <span className="text-muted-foreground animate-pulse">...</span>
                          ) : (
                            formatCurrency(it.lineTotal, false)
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.tempId)}
                            className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
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
          <div className="p-4 rounded-xl border border-border bg-card grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                Total Pieces & Weights
              </span>
              <p className="font-semibold text-sm mt-1 text-foreground">
                {totals.totalPcs} pcs | {formatWeight(totals.totalGrossWeight)}g Gross
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Net Wt: {formatWeight(totals.totalNetWeight)}g
              </p>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                Metal & Labour Breakdown
              </span>
              <p className="font-mono text-xs mt-1 text-foreground">
                Metal: {formatCurrency(totals.metalValue)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Making: {formatCurrency(totals.totalMaking)}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                Taxable & GST
              </span>
              <p className="font-mono text-xs mt-1 text-foreground">
                Taxable: {formatCurrency(totals.taxableAmount)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                GST (3%): {formatCurrency(totals.taxAmount)}
              </p>
            </div>

            <div className="text-right flex flex-col justify-center">
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                ESTIMATED GRAND TOTAL
              </span>
              <p className="text-xl font-bold text-primary font-mono mt-0.5">
                {formatCurrency(Math.round(totals.grandTotal))}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg text-xs hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting || items.length === 0 || !selectedCustomer}
              onClick={handleSubmit}
              className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving Quotation...
                </>
              ) : (
                'Save & Create Quotation'
              )}
            </button>
          </div>
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
