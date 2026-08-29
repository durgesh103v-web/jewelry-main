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

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <header className="h-13 px-4 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <h1 className="font-bold text-sm text-foreground tracking-tight flex items-center gap-2">
                <span>Sales Return & Customer Credit Note</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  {lifecycleStage}
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
              className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors font-medium border border-border"
            >
              Clear Selection
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Close Return"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Global Alerts */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="text-destructive font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Column: Invoice Lookup & Returnable Items Table */}
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

        {/* Right Column: Reason, Refund, and Summary */}
        <div className="w-80 flex flex-col gap-3 shrink-0 overflow-y-auto pr-0.5">
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>📝</span>
              <span>Return Details</span>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                Reason for Return:
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Size mismatch, Customer exchange..."
                className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                Notes:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary"
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
            returnType="SALES_RETURN"
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

      {/* Unsaved Prompt */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="font-bold text-foreground text-sm">Discard Active Return?</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              You have return items selected. Clearing will reset all transient return selections.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedPrompt(false)
                  setPendingClose(false)
                }}
                className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold"
              >
                Keep Return
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsavedAction}
                className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-bold"
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

export default SalesReturnScreen
