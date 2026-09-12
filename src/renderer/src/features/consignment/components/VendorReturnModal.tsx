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

const ITEM_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  IN_SHOWROOM: { label: 'In Showroom', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SOLD: { label: 'Sold (Not Returnable)', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  RETURNED: { label: 'Already Returned', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
}

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
        itemIds: selectedIds,
        returnDate,
        notes: notes.trim() || undefined
      }

      const result = await window.api.consignment.returnItems(payload)

      setReturnResult({
        returnId: result.returnId,
        returnNumber: result.returnNumber,
        returnedPieces: result.returnedPieces,
        totalGrossWeight: result.totalGrossWeight
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
    const cfg = ITEM_STATUS_CONFIG[status] || {
      label: status,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200'
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-base shadow-2xs">
              ↩️
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Vendor Consignment Return</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                  Unsold Pieces Custody Exit
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Memo: <span className="font-semibold text-slate-800">{inward.consignmentNumber}</span> • Vendor: <span className="font-semibold text-slate-800">{inward.supplierName || 'Unknown Vendor'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSubmitting && step !== 'SUCCESS' && (
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5">
          {/* Global Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex justify-between items-center shadow-2xs shrink-0">
              <span className="flex items-center gap-2 font-medium">
                <span>⚠️</span>
                <span>{error}</span>
              </span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-100 px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: ITEM SELECTION & RETURN METADATA */}
          {step === 'SELECTION' && (
            <>
              {/* Scan Bar & Quick Actions */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-2 shrink-0">
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
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!scanQuery.trim()}
                      className="h-9 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs text-xs disabled:opacity-50 cursor-pointer"
                      style={{ color: '#ffffff' }}
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
                      className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors border border-slate-300 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      Select All Eligible ({eligibleItems.length})
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium rounded-lg border border-slate-300 shadow-2xs cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                {/* Scan Feedback Message */}
                {scanMessage && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                      scanMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <span>{scanMessage.text}</span>
                    <button
                      type="button"
                      onClick={() => setScanMessage(null)}
                      className="font-bold px-1 hover:opacity-80 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Items Selection Table */}
              <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs min-h-[220px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight select-none">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="py-2.5 px-3">Barcode / Tag</th>
                      <th className="py-2.5 px-3">Item Design / Master</th>
                      <th className="py-2.5 px-3">Vendor Code</th>
                      <th className="py-2.5 px-2 text-center">Purity</th>
                      <th className="py-2.5 px-3 text-right">Gross Wt</th>
                      <th className="py-2.5 px-3 text-right">Net Wt</th>
                      <th className="py-2.5 px-3 text-right">Vendor Cost</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                                ? 'opacity-60 bg-slate-50 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-amber-50/70 hover:bg-amber-100/60 cursor-pointer font-semibold'
                                  : 'hover:bg-amber-50/30 cursor-pointer'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isEligible}
                                onChange={() => handleToggleItem(it.id, it.status)}
                                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-30 cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {it.barcode || it.stockItemCode}
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {it.itemName}
                              {it.notes && (
                                <div className="text-[10px] text-slate-500 italic font-normal">
                                  {it.notes}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-slate-600 font-medium">
                              {it.vendorItemCode || '-'}
                            </td>

                            <td className="py-2.5 px-2 text-center text-slate-700 font-medium">
                              {it.purityName} ({it.tunch}%)
                            </td>

                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatWeight(it.grossWeight)}
                            </td>

                            <td className="py-2.5 px-3 text-right text-slate-700">
                              {formatWeight(it.netWeight)}
                            </td>

                            <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                              {formatCurrency(it.vendorCost)}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              {renderItemStatusBadge(it.status)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No items in this memo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Return Metadata & Action Toolbar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-48">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Return Date <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Return Remarks / Reason
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. 30-day memo period concluded, unsold stock returned in good order"
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Selected Summary Footer */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Selected Return Pieces</span>
                    <div className="text-base font-bold text-slate-900">
                      {selectedSummary.totalPieces} / {eligibleItems.length} Pcs
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Gross Weight</span>
                    <div className="text-base font-bold text-slate-900">
                      {formatWeight(selectedSummary.totalGrossWeight)}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Vendor Agreed Value</span>
                    <div className="text-base font-extrabold text-amber-700">
                      {formatCurrency(selectedSummary.totalVendorValuation)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('CONFIRM')}
                    disabled={selectedIds.length === 0}
                    className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs disabled:opacity-50 cursor-pointer"
                    style={selectedIds.length > 0 ? { color: '#ffffff' } : {}}
                  >
                    Review &amp; Return ({selectedIds.length}) →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: CONFIRMATION REVIEW */}
          {step === 'CONFIRM' && (
            <div className="flex-1 flex flex-col gap-4 max-w-xl mx-auto w-full py-2">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-2">
                <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <span>⚠️ Confirm Custody Exit &amp; Vendor Return</span>
                </div>
                <p className="text-amber-800 font-medium leading-relaxed">
                  You are about to return <strong className="text-slate-900">{selectedSummary.totalPieces} unsold piece(s)</strong> totaling{' '}
                  <strong className="text-slate-900">{formatWeight(selectedSummary.totalGrossWeight)}</strong> back to{' '}
                  <strong className="text-slate-900">{inward.supplierName}</strong>.
                </p>
                <p className="text-[11px] text-amber-700">
                  These physical stock items will immediately transition from `IN_STOCK` to `RETURNED` status, removing them from showroom active custody and releasing associated memo liability.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Memo Number:</span>
                  <span className="font-bold text-slate-900">{inward.consignmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor / Supplier:</span>
                  <span className="font-semibold text-slate-800">{inward.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Return Date:</span>
                  <span className="font-semibold text-slate-800">{formatDate(returnDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Return Pieces:</span>
                  <span className="font-bold text-slate-900">{selectedSummary.totalPieces} Pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Return Weight:</span>
                  <span className="font-bold text-slate-900">{formatWeight(selectedSummary.totalGrossWeight)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Released Vendor Valuation:</span>
                  <span className="font-bold text-amber-700 text-sm">{formatCurrency(selectedSummary.totalVendorValuation)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('SELECTION')}
                  disabled={isSubmitting}
                  className="h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  ← Back to Selection
                </button>

                <button
                  type="button"
                  onClick={() => void handleConfirmReturn()}
                  disabled={isSubmitting}
                  className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin text-xs">⏳</span>
                      <span>Processing Return...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Generate Return Voucher</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS RESULT */}
          {step === 'SUCCESS' && returnResult && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-2xl font-bold shadow-2xs">
                ✓
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Vendor Return Voucher Generated!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Physical stock items have exited showroom custody.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full space-y-2 text-xs font-mono text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Return Voucher No:</span>
                  <span className="font-bold text-slate-900">{returnResult.returnNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Returned Pieces:</span>
                  <span className="font-semibold text-slate-800">{returnResult.returnedPieces} Pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Return Weight:</span>
                  <span className="font-semibold text-slate-800">{formatWeight(returnResult.totalGrossWeight)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  Done
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
