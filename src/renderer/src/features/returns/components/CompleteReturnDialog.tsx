import React, { useEffect, useRef } from 'react'
import type { ReturnType, ReturnRecord, ReturnRefundPayload } from '@shared/types/returnTransaction'
import type { SelectedReturnItem } from '../types'

interface CompleteReturnDialogProps {
  isOpen: boolean
  onClose: () => void
  returnType: ReturnType
  originalInvoice: any | null
  selectedItems: SelectedReturnItem[]
  refunds: (ReturnRefundPayload & { id: string })[]
  summary: {
    totalPcs: number
    totalGrossWeight: number
    returnTotal: number
    totalRefund: number
    adjustmentAmount: number
  }
  isSubmitting: boolean
  error: string | null
  completedReturn: ReturnRecord | null
  onConfirmReturn: () => Promise<any>
  onNewReturn: () => void
}

export const CompleteReturnDialog: React.FC<CompleteReturnDialogProps> = ({
  isOpen,
  onClose,
  returnType,
  originalInvoice,
  selectedItems,
  refunds,
  summary,
  isSubmitting,
  error,
  completedReturn,
  onConfirmReturn,
  onNewReturn
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const isSaleReturn = returnType === 'SALES_RETURN'

  useEffect(() => {
    if (isOpen) {
      if (completedReturn) {
        nextBtnRef.current?.focus()
      } else {
        confirmBtnRef.current?.focus()
      }
    }
  }, [isOpen, completedReturn])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (!isSubmitting) {
        onClose()
      }
    }
  }

  if (!isOpen) return null

  // Post-return success screen
  if (completedReturn) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
            ✓
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {isSaleReturn ? 'Sales Return & Credit Note Created!' : 'Purchase Return & Debit Note Created!'}
          </h2>
          <div className="text-sm text-muted-foreground mt-1 font-mono">
            Return No: <span className="font-bold text-foreground">{completedReturn.returnNumber}</span>
          </div>

          <div className="my-5 p-3.5 bg-muted/40 rounded-xl border border-border text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Invoice:</span>
              <span className="font-mono font-semibold text-foreground">{completedReturn.originalInvoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Note Type:</span>
              <span className="font-bold text-primary">{completedReturn.noteType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Return Value:</span>
              <span className="font-mono font-bold text-foreground">
                ₹{completedReturn.returnTotal.toLocaleString()}
              </span>
            </div>
            {completedReturn.refundAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund Outflow:</span>
                <span className="font-mono font-semibold text-foreground">
                  ₹{completedReturn.refundAmount.toLocaleString()}
                </span>
              </div>
            )}
            {completedReturn.adjustmentAmount > 0 && (
              <div className="flex justify-between border-t border-border/60 pt-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <span>{isSaleReturn ? 'Customer Ledger Credit:' : 'Supplier Ledger Offset:'}</span>
                <span className="font-mono">₹{completedReturn.adjustmentAmount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 h-10 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Print {completedReturn.noteType}</span>
            </button>
            <button
              ref={nextBtnRef}
              type="button"
              onClick={() => {
                onNewReturn()
                onClose()
              }}
              className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <span>✨</span>
              <span>Done (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Pre-return confirmation
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <span>🔄</span>
            <span>
              Confirm {isSaleReturn ? 'Sales Return & Credit Note' : 'Purchase Return & Debit Note'}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
              ⚠️ {error}
            </div>
          )}

          <div className="p-3 bg-muted/30 border border-border/60 rounded-xl space-y-1.5">
            <div className="font-semibold text-foreground text-sm flex items-center justify-between">
              <span>Invoice: {originalInvoice?.invoiceNumber}</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">({originalInvoice?.invoiceDate})</span>
            </div>
            <div className="text-muted-foreground flex gap-3 text-[11px]">
              <span>📦 {selectedItems.length} item(s) returning</span>
              <span>⚖️ {summary.totalGrossWeight.toFixed(3)}g total gross</span>
            </div>
          </div>

          <div className="space-y-1.5 border-y border-border/60 py-3">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>Total Return Value:</span>
              <span className="font-mono text-primary">
                ₹{summary.returnTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-foreground">Settlement Breakdown:</div>
            {refunds
              .filter((r) => r.amount > 0)
              .map((r, i) => (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>
                    Refund via {r.paymentMethod} {r.paymentReference ? `(${r.paymentReference})` : ''}
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    ₹{r.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            {summary.adjustmentAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                <span>{isSaleReturn ? 'Customer Ledger Credit:' : 'Supplier Ledger Offset:'}</span>
                <span className="font-mono">₹{summary.adjustmentAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-muted/40 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl font-medium"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirmReturn}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold rounded-xl shadow-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Finalizing Return...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Post Return Transaction (Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
