import React, { useState, useEffect, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import type {
  ConsignmentInwardRecord,
  ConsignmentItemRecord,
  ConsignmentItemStatus,
  ReturnConsignmentItemsPayload
} from '@shared/types/consignment'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

export interface VendorReturnModalProps {
  isOpen: boolean
  onClose: () => void
  inward: ConsignmentInwardRecord
  onReturnSuccess: () => Promise<void> | void
}

type ModalStep = 'SELECTION' | 'CONFIRM' | 'SUCCESS'

export const VendorReturnModal: React.FC<VendorReturnModalProps> = ({
  isOpen,
  onClose,
  inward,
  onReturnSuccess
}) => {
  // Step state
  const [step, setStep] = useState<ModalStep>('SELECTION')

  // Selected item IDs for return
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Return metadata
  const [returnDate, setReturnDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [notes, setNotes] = useState<string>('')

  // Scanner & Feedback state
  const [scanQuery, setScanQuery] = useState<string>('')
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Success result state from backend
  const [returnResult, setReturnResult] = useState<{
    returnId: string
    returnNumber: string
    returnedPieces: number
    totalGrossWeight: number
  } | null>(null)

  const scanInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('SELECTION')
      setSelectedIds([])
      setReturnDate(dayjs().format('YYYY-MM-DD'))
      setNotes('')
      setScanQuery('')
      setScanMessage(null)
      setError(null)
      setReturnResult(null)
      setTimeout(() => scanInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Filter returnable items (only IN_SHOWROOM items can be returned unsold to vendor)
  const eligibleItems = useMemo(() => {
    return (inward.items || []).filter((it) => it.status === 'IN_SHOWROOM')
  }, [inward.items])

  // Selected items objects for summary
  const selectedItems = useMemo(() => {
    const idSet = new Set(selectedIds)
    return (inward.items || []).filter((it) => idSet.has(it.id))
  }, [inward.items, selectedIds])

  // Selected items summary (presentation-only)
  const selectedSummary = useMemo(() => {
    return selectedItems.reduce(
      (acc, it) => ({
        totalPieces: acc.totalPieces + 1,
        totalGrossWeight: Number((acc.totalGrossWeight + it.grossWeight).toFixed(3)),
        totalVendorValuation: Number((acc.totalVendorValuation + it.vendorCost).toFixed(2))
      }),
      { totalPieces: 0, totalGrossWeight: 0, totalVendorValuation: 0 }
    )
  }, [selectedItems])

  // Toggle single item selection
  const handleToggleItem = (itemId: string, status: ConsignmentItemStatus) => {
    if (status !== 'IN_SHOWROOM') return
    setError(null)
    setScanMessage(null)
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  // Select all eligible
  const handleSelectAllEligible = () => {
    setError(null)
    setScanMessage(null)
    setSelectedIds(eligibleItems.map((it) => it.id))
  }

  // Clear selection
  const handleClearSelection = () => {
    setError(null)
    setScanMessage(null)
    setSelectedIds([])
  }

  // Handle Barcode Scan / Manual Entry
  const handleBarcodeScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setScanMessage(null)
    setError(null)

    const code = scanQuery.trim()
    if (!code) return

    const matchedItem = (inward.items || []).find(
      (it) =>
        it.barcode?.toLowerCase() === code.toLowerCase() ||
        it.stockItemCode?.toLowerCase() === code.toLowerCase() ||
        it.vendorItemCode?.toLowerCase() === code.toLowerCase()
    )

    if (!matchedItem) {
      setScanMessage({
        type: 'error',
        text: `Barcode / code "${code}" not found in this consignment inward memo.`
      })
      setScanQuery('')
      return
    }

    if (matchedItem.status === 'SOLD') {
      setScanMessage({
        type: 'error',
        text: `Item "${matchedItem.barcode || matchedItem.itemName}" is already SOLD at POS and cannot be returned.`
      })
      setScanQuery('')
      return
    }

    if (matchedItem.status === 'RETURNED') {
      setScanMessage({
        type: 'error',
        text: `Item "${matchedItem.barcode || matchedItem.itemName}" has already been returned to vendor.`
      })
      setScanQuery('')
      return
    }

    // Eligible item found
    if (selectedIds.includes(matchedItem.id)) {
      setScanMessage({
        type: 'success',
        text: `Item "${matchedItem.barcode || matchedItem.itemName}" is already selected.`
      })
    } else {
      setSelectedIds((prev) => [...prev, matchedItem.id])
      setScanMessage({
        type: 'success',
        text: `✓ Selected: ${matchedItem.barcode || matchedItem.stockItemCode} — ${matchedItem.itemName} (${formatWeight(matchedItem.grossWeight)})`
      })
    }
    setScanQuery('')
  }

  // Execute authoritative return via IPC
  const handleConfirmReturn = async () => {
    if (selectedIds.length === 0) {
      setError('Please select at least one eligible item to return.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: ReturnConsignmentItemsPayload = {
        consignmentInwardId: inward.id,
        consignmentItemIds: selectedIds,
        returnDate,
        notes: notes.trim() || undefined
      }

      const result = await window.api.consignment.returnItems(payload)

      setReturnResult({
        returnId: result.returnId,
        returnNumber: result.returnNumber,
        returnedPieces: selectedSummary.totalPieces,
        totalGrossWeight: selectedSummary.totalGrossWeight
      })

      setStep('SUCCESS')

      // Trigger detail & hub refresh
      if (onReturnSuccess) {
        await onReturnSuccess()
      }
    } catch (err: unknown) {
      console.error('Failed to process vendor return:', err)
      setError(getFriendlyErrorMessage(err))
      setStep('SELECTION')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderItemStatusBadge = (status: ConsignmentItemStatus) => {
    switch (status) {
      case 'IN_SHOWROOM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            IN SHOWROOM
          </span>
        )
      case 'SOLD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            SOLD (NOT RETURNABLE)
          </span>
        )
      case 'RETURNED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            ALREADY RETURNED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
            {status}
          </span>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base shadow-sm">
              ↩️
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Vendor Consignment Return</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20">
                  Unsold Pieces Custody Exit
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Memo: <span className="font-mono font-semibold text-foreground">{inward.consignmentNumber}</span> • Vendor: <span className="font-semibold text-foreground">{inward.supplierName || 'Unknown Vendor'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSubmitting && step !== 'SUCCESS' && (
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center font-bold text-sm ml-2 transition-colors"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
          {/* Global Error Banner */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex justify-between items-center shadow-sm shrink-0">
              <span className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-destructive/20"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: ITEM SELECTION & RETURN METADATA */}
          {step === 'SELECTION' && (
            <>
              {/* Scan Bar & Quick Actions */}
              <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  {/* Barcode Scanner Input */}
                  <form onSubmit={handleBarcodeScanSubmit} className="flex-1 flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        ref={scanInputRef}
                        type="text"
                        value={scanQuery}
                        onChange={(e) => setScanQuery(e.target.value)}
                        placeholder="Scan or enter item barcode / tag to select for return (Press Enter)..."
                        className="w-full h-8 pl-8 pr-3 bg-background border border-input rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="absolute left-2.5 top-2 text-muted-foreground text-xs">🔍</span>
                    </div>
                    <button
                      type="submit"
                      disabled={!scanQuery.trim()}
                      className="h-8 px-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                    >
                      Scan &amp; Add
                    </button>
                  </form>

                  {/* Bulk Select Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllEligible}
                      disabled={eligibleItems.length === 0 || selectedIds.length === eligibleItems.length}
                      className="h-8 px-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors border border-border disabled:opacity-50"
                    >
                      Select All Eligible ({eligibleItems.length})
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg transition-colors border border-border"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                {/* Scan Feedback Message */}
                {scanMessage && (
                  <div
                    className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between ${
                      scanMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-destructive/10 text-destructive border border-destructive/20'
                    }`}
                  >
                    <span>{scanMessage.text}</span>
                    <button
                      type="button"
                      onClick={() => setScanMessage(null)}
                      className="font-bold px-1 hover:opacity-80"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Items Selection Table */}
              <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm min-h-[220px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="py-2 px-3">Barcode / Tag</th>
                      <th className="py-2 px-3">Item Design / Master</th>
                      <th className="py-2 px-3">Vendor Code</th>
                      <th className="py-2 px-2 text-center">Purity</th>
                      <th className="py-2 px-3 text-right">Gross Wt</th>
                      <th className="py-2 px-3 text-right">Net Wt</th>
                      <th className="py-2 px-3 text-right">Vendor Cost</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {inward.items && inward.items.length > 0 ? (
                      inward.items.map((it: ConsignmentItemRecord) => {
                        const isEligible = it.status === 'IN_SHOWROOM'
                        const isSelected = selectedIds.includes(it.id)

                        return (
                          <tr
                            key={it.id}
                            onClick={() => handleToggleItem(it.id, it.status)}
                            className={`transition-colors ${
                              !isEligible
                                ? 'opacity-60 bg-muted/20 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-primary/5 hover:bg-primary/10 cursor-pointer'
                                  : 'hover:bg-muted/30 cursor-pointer'
                            }`}
                          >
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isEligible}
                                onChange={() => handleToggleItem(it.id, it.status)}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-30 cursor-pointer"
                              />
                            </td>

                            <td className="py-2 px-3 font-mono font-bold text-foreground">
                              {it.barcode || it.stockItemCode}
                            </td>

                            <td className="py-2 px-3 font-semibold text-foreground">
                              {it.itemName}
                              {it.notes && (
                                <div className="text-[10px] text-muted-foreground italic font-normal">
                                  {it.notes}
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-3 font-mono text-muted-foreground">
                              {it.vendorItemCode || '-'}
                            </td>

                            <td className="py-2 px-2 text-center font-mono">
                              {it.purityName} ({it.tunch}%)
                            </td>

                            <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                              {formatWeight(it.grossWeight)}
                            </td>

                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {formatWeight(it.netWeight)}
                            </td>

                            <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                              {formatCurrency(it.vendorCost)}
                            </td>

                            <td className="py-2 px-3 text-center">
                              {renderItemStatusBadge(it.status)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-muted-foreground">
                          No items found in this consignment inward.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Return Metadata: Date & Notes */}
              <div className="bg-card p-3 rounded-xl border border-border shadow-sm grid grid-cols-12 gap-3 shrink-0">
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-foreground mb-1">
                    Return Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full h-8 px-3 bg-background border border-input rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-8">
                  <label className="block text-[10px] font-bold text-foreground mb-1">
                    Return Remarks / Reason
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 30-day memo period concluded, unsold stock returned in good order"
                    className="w-full h-8 px-3 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Summary Strip & Action Bar */}
              <footer className="bg-muted/40 p-3 rounded-xl border border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6 font-mono text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Selected Return Pieces</span>
                    <span className="text-base font-bold text-foreground">
                      {selectedSummary.totalPieces} / {eligibleItems.length} Pcs
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Total Gross Weight</span>
                    <span className="text-base font-bold text-foreground">
                      {formatWeight(selectedSummary.totalGrossWeight)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Total Vendor Agreed Value</span>
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(selectedSummary.totalVendorValuation)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors border border-border"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={() => setStep('CONFIRM')}
                    className="h-8 px-4 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <span>Review &amp; Return ({selectedIds.length})</span>
                    <span>→</span>
                  </button>
                </div>
              </footer>
            </>
          )}

          {/* STEP 2: CONFIRMATION STEP */}
          {step === 'CONFIRM' && (
            <div className="py-4 px-6 max-w-lg mx-auto w-full flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-sm">
                ⚠️
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">
                  Confirm Vendor Return of {selectedSummary.totalPieces} Piece(s)?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You are about to return unsold jewellery pieces from showroom custody back to <strong className="text-foreground">{inward.supplierName}</strong>.
                </p>
              </div>

              {/* Confirmation Summary Box */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border text-left font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consignment Memo:</span>
                  <span className="font-bold text-foreground">{inward.consignmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor / Supplier:</span>
                  <span className="font-bold text-foreground">{inward.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Returning Pieces:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {selectedSummary.totalPieces} Pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Gross Weight:</span>
                  <span className="font-bold text-foreground">
                    {formatWeight(selectedSummary.totalGrossWeight)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor Valuation:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(selectedSummary.totalVendorValuation)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Return Date:</span>
                  <span className="font-semibold text-foreground">{formatDate(returnDate)}</span>
                </div>
                {notes && (
                  <div className="pt-2 border-t border-border/80 text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase">Remarks:</span>
                    <span className="text-foreground italic">{notes}</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-[11px] text-left">
                ⚠️ <strong>Authoritative Custody Removal:</strong> These serialized items will be marked as <code className="font-bold">RETURNED_TO_VENDOR</code> in physical stock and removed from active showroom inventory. This operation cannot be undone.
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('SELECTION')}
                  className="h-9 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors border border-border"
                >
                  ← Back to Selection
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirmReturn()}
                  className="h-9 px-5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>Processing Return...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Process Return</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS RESULT */}
          {step === 'SUCCESS' && returnResult && (
            <div className="py-6 px-6 max-w-md mx-auto w-full flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-sm">
                ✓
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">
                  Vendor Return Processed Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  The returned pieces have been processed and removed from consignment showroom stock.
                </p>
              </div>

              <div className="bg-muted/40 p-4 rounded-xl border border-border text-left font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Return Number:</span>
                  <span className="font-bold text-primary text-sm">{returnResult.returnNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consignment Memo:</span>
                  <span className="font-bold text-foreground">{inward.consignmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="font-semibold text-foreground">{inward.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Returned Pieces:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {returnResult.returnedPieces} Pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Gross Weight:</span>
                  <span className="font-bold text-foreground">
                    {formatWeight(returnResult.totalGrossWeight)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Return Date:</span>
                  <span className="font-semibold text-foreground">{formatDate(returnDate)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] text-left">
                ℹ️ Physical items are updated to <code className="font-bold">RETURNED_TO_VENDOR</code>. Consignment memo physical status has been refreshed by the backend.
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-6 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Done &amp; View Updated Memo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VendorReturnModal
