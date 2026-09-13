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

  // ── SUCCESS SCREEN ──
  if (completedReturn) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
            ✓
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {isSaleReturn ? 'Sales Return & Credit Note Created!' : 'Purchase Return & Debit Note Created!'}
          </h2>
          <div className="text-sm text-slate-500 mt-1 font-mono">
            Return No: <span className="font-bold text-slate-900">{completedReturn.returnNumber}</span>
          </div>

          <div className="my-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Original Invoice:</span>
              <span className="font-mono font-bold text-slate-900">{completedReturn.originalInvoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Note Type:</span>
              <span className="font-bold text-amber-700">{completedReturn.noteType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Return Value:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{completedReturn.returnTotal.toLocaleString()}
              </span>
            </div>
            {completedReturn.refundAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Refund Outflow:</span>
                <span className="font-mono font-semibold text-slate-900">
                  ₹{completedReturn.refundAmount.toLocaleString()}
                </span>
              </div>
            )}
            {completedReturn.adjustmentAmount > 0 && (
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-emerald-700 font-bold">
                <span>{isSaleReturn ? 'Customer Ledger Credit:' : 'Supplier Ledger Offset:'}</span>
                <span className="font-mono">₹{completedReturn.adjustmentAmount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print {completedReturn.noteType}</span>
            </button>
            <button
              ref={nextBtnRef}
              type="button"
              onClick={() => { onNewReturn(); onClose() }}
              className="flex-1 h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <span>✨</span>
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CONFIRM SCREEN ──
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>🔄</span>
            <span>Confirm {isSaleReturn ? 'Sales Return & Credit Note' : 'Purchase Return & Debit Note'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Invoice Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-semibold text-slate-900 text-sm flex items-center justify-between">
              <span>Invoice: {originalInvoice?.invoiceNumber}</span>
              <span className="text-xs font-mono font-normal text-slate-400">({originalInvoice?.invoiceDate})</span>
            </div>
            <div className="text-slate-500 flex gap-3 text-[11px]">
              <span>📦 {selectedItems.length} item(s) returning</span>
              <span>⚖️ {summary.totalGrossWeight.toFixed(3)}g total gross</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between font-bold text-sm text-slate-900 border-y border-slate-100 py-3">
            <span>Total Return Value:</span>
            <span className="font-mono text-amber-700">₹{summary.returnTotal.toLocaleString()}</span>
          </div>

          {/* Settlement Breakdown */}
          <div className="space-y-1.5">
            <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
              Settlement Breakdown
            </div>
            {refunds
              .filter((r) => r.amount > 0)
              .map((r, i) => (
                <div key={i} className="flex justify-between text-slate-500">
                  <span>Refund via {r.paymentMethod} {r.paymentReference ? `(${r.paymentReference})` : ''}</span>
                  <span className="font-mono font-semibold text-slate-800">₹{r.amount.toLocaleString()}</span>
                </div>
              ))}
            {summary.adjustmentAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-100">
                <span>{isSaleReturn ? 'Customer Ledger Credit:' : 'Supplier Ledger Offset:'}</span>
                <span className="font-mono">₹{summary.adjustmentAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold disabled:opacity-50 cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirmReturn}
            disabled={isSubmitting}
            className="h-9 px-5 text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Finalizing Return...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Post Return Transaction</span>
                <kbd className="text-[10px] font-mono opacity-70">Enter</kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
