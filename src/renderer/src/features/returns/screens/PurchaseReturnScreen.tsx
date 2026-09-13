import React, { useState, useEffect, useCallback } from 'react'
import { useReturnTransaction } from '../hooks/useReturnTransaction'
import { OriginalInvoiceLookup } from '../components/OriginalInvoiceLookup'
import { ReturnableItemsTable } from '../components/ReturnableItemsTable'
import { ReturnSummaryPanel } from '../components/ReturnSummaryPanel'
import { CompleteReturnDialog } from '../components/CompleteReturnDialog'
import { PaymentPanel } from '../../sales/components/PaymentPanel'

interface PurchaseReturnScreenProps {
  onClose?: () => void
}

export const PurchaseReturnScreen: React.FC<PurchaseReturnScreenProps> = ({ onClose }) => {
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
  } = useReturnTransaction('PURCHASE_RETURN')

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

  const stageBadgeClass =
    lifecycleStage === 'COMPLETED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : lifecycleStage === 'PROCESSING'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-13 px-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                <span>Purchase Return & Supplier Debit Note</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${stageBadgeClass}`}>
                  {lifecycleStage.replace('_', ' ')}
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={handleRequestClear}
              className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-colors font-medium border border-slate-200 cursor-pointer"
            >
              Clear Selection
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-xs px-2.5 py-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close Return"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Global Alerts */}
      {error && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 font-bold text-xs hover:text-rose-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Column: Invoice Lookup & Returnable Items Table */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          <OriginalInvoiceLookup
            returnType="PURCHASE_RETURN"
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

        {/* Right Column: Reason, Return Date, Refund, and Summary */}
        <div className="w-80 flex flex-col gap-3 shrink-0 overflow-y-auto pr-0.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>📝</span>
              <span>Debit Note Details</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1 uppercase tracking-wide">
                Debit Note / Return Date:
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-800 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1 uppercase tracking-wide">
                Reason for Return:
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Defective casting, Purity mismatch..."
                disabled={isSubmitting}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-slate-800 placeholder:text-slate-400 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1 uppercase tracking-wide">
                Notes:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                disabled={isSubmitting}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-slate-800 placeholder:text-slate-400 disabled:bg-slate-50"
              />
            </div>
          </div>

          <PaymentPanel
            payments={refunds}
            netPayable={summary.returnTotal}
            onAddPayment={addRefundLine}
            onUpdatePayment={updateRefundLine}
            onRemovePayment={removeRefundLine}
          />

          <ReturnSummaryPanel
            returnType="PURCHASE_RETURN"
            summary={summary}
            onOpenCompleteDialog={() => setIsConfirmOpen(true)}
            disabled={isSubmitting || selectedItems.length === 0 || !originalInvoice}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <CompleteReturnDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        returnType="PURCHASE_RETURN"
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

      {/* Unsaved Prompt */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="font-bold text-slate-900 text-sm">Discard Active Return?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              You have return items selected. Clearing will reset all transient return selections.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedPrompt(false)
                  setPendingClose(false)
                }}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Keep Return
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsavedAction}
                className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Discard & Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PurchaseReturnScreen
