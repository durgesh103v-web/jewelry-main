import React, { useState, useEffect, useCallback } from 'react'
import { useReturnTransaction } from '../hooks/useReturnTransaction'
import { OriginalInvoiceLookup } from '../components/OriginalInvoiceLookup'
import { ReturnableItemsTable } from '../components/ReturnableItemsTable'
import { ReturnSummaryPanel } from '../components/ReturnSummaryPanel'
import { CompleteReturnDialog } from '../components/CompleteReturnDialog'
import { PaymentPanel } from '../../sales/components/PaymentPanel'

interface SalesReturnScreenProps {
  onClose?: () => void
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  SELECT_INVOICE: { label: 'Select Invoice', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  SELECT_ITEMS:   { label: 'Select Items',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ITEMS_SELECTED: { label: 'Items Ready',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  REFUND_ENTRY:   { label: 'Refund Entry',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  CONFIRMATION:   { label: 'Confirming',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSING:     { label: 'Processing…',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED:      { label: 'Completed ✓',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ERROR:          { label: 'Error',          color: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export const SalesReturnScreen: React.FC<SalesReturnScreenProps> = ({ onClose }) => {
  const {
    lifecycleStage,
    originalInvoice,
    selectInvoice,
    returnableItems,
    selectedItems,
    setItemReturnQuantity,
    refunds,
    addRefundLine,
    updateRefundLine,
    removeRefundLine,
    reason,
    setReason,
    notes,
    setNotes,
    returnDate,
    setReturnDate,
    summary,
    hasUnsavedChanges,
    isSubmitting,
    error,
    setError,
    completedReturn,
    submitReturn,
    resetReturn
  } = useReturnTransaction('SALES_RETURN')

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault()
        if (selectedItems.length > 0 && originalInvoice && !isSubmitting) {
          setIsConfirmOpen(true)
        }
      } else if (e.key === 'Escape') {
        if (isConfirmOpen && !completedReturn && !isSubmitting) {
          setIsConfirmOpen(false)
        } else if (showUnsavedPrompt) {
          setShowUnsavedPrompt(false)
          setPendingClose(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConfirmOpen, showUnsavedPrompt, selectedItems.length, originalInvoice, isSubmitting, completedReturn])

  const handleRequestClear = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingClose(false)
      setShowUnsavedPrompt(true)
    } else {
      resetReturn()
    }
  }, [hasUnsavedChanges, resetReturn])

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingClose(true)
      setShowUnsavedPrompt(true)
    } else if (onClose) {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  const handleConfirmUnsavedAction = useCallback(() => {
    setShowUnsavedPrompt(false)
    resetReturn()
    if (pendingClose && onClose) {
      onClose()
    }
    setPendingClose(false)
  }, [pendingClose, resetReturn, onClose])

  const stageInfo = STAGE_LABELS[lifecycleStage] ?? { label: lifecycleStage, color: 'bg-slate-100 text-slate-500 border-slate-200' }

  return (
    <div className="h-full flex flex-col bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden">

      {/* ── TOP HEADER ── */}
      <header className="h-11 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-sm shrink-0 z-10"
        style={{ boxShadow: '0 1px 0 #e2e8f0, 0 2px 8px rgba(15,23,42,0.04)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-base">
            🔄
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Sales Return &amp; Customer Credit Note</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${stageInfo.color}`}>
                {stageInfo.label}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Process customer returns &amp; issue credit notes against original sales invoices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={handleRequestClear}
              className="h-8 px-3 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              ✕ Clear Selection
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={handleRequestClose}
              className="h-8 px-3 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              ← Back
            </button>
          )}
        </div>
      </header>

      {/* ── GLOBAL ALERT ── */}
      {error && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold text-rose-600 hover:text-rose-800 cursor-pointer">✕</button>
        </div>
      )}

      {/* ── WORKSPACE ── */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">

        {/* Left Column: Invoice Lookup & Returnable Items */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          <OriginalInvoiceLookup
            returnType="SALES_RETURN"
            selectedInvoice={originalInvoice}
            onSelectInvoice={selectInvoice}
            disabled={isSubmitting}
          />

          <ReturnableItemsTable
            returnableItems={returnableItems}
            selectedItems={selectedItems}
            onSetItemQuantity={setItemReturnQuantity}
          />
        </div>

        {/* Right Column: Details, Payment, Summary */}
        <div className="w-72 flex flex-col gap-3 shrink-0 overflow-y-auto">

          {/* Return Details Card */}
          <div className="erp-card-panel gap-3">
            <div className="erp-card-panel-header">
              <div className="erp-card-panel-title">
                <span className="text-base">📝</span>
                Return Details
              </div>
            </div>

            {/* Return Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Return Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-slate-800"
              />
            </div>

            {/* Reason for Return */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Reason for Return
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Size mismatch, Customer exchange..."
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Internal Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
              />
            </div>
          </div>

          {/* Payment / Refund Panel */}
          <PaymentPanel
            payments={refunds}
            netPayable={summary.returnTotal}
            onAddPayment={addRefundLine}
            onUpdatePayment={updateRefundLine}
            onRemovePayment={removeRefundLine}
          />

          {/* Summary + Submit */}
          <ReturnSummaryPanel
            returnType="SALES_RETURN"
            summary={summary}
            onOpenCompleteDialog={() => setIsConfirmOpen(true)}
            disabled={isSubmitting || selectedItems.length === 0 || !originalInvoice}
          />
        </div>
      </div>

      {/* ── CONFIRM DIALOG ── */}
      <CompleteReturnDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        returnType="SALES_RETURN"
        originalInvoice={originalInvoice}
        selectedItems={selectedItems}
        refunds={refunds}
        summary={summary}
        isSubmitting={isSubmitting}
        error={error}
        completedReturn={completedReturn}
        onConfirmReturn={submitReturn}
        onNewReturn={() => {
          resetReturn()
          setIsConfirmOpen(false)
        }}
      />

      {/* ── UNSAVED CHANGES PROMPT ── */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-sm p-5 text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="font-bold text-slate-900 text-sm">Discard Active Return?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              You have return items selected. Clearing will reset all selections.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowUnsavedPrompt(false); setPendingClose(false) }}
                className="flex-1 h-9 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Keep Return
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsavedAction}
                className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Discard &amp; Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesReturnScreen
