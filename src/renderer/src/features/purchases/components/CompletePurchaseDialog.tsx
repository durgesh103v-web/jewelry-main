import React, { useEffect, useRef } from 'react'
import type { SupplierRecord } from '@shared/types/supplier'
import type { PurchaseBillItem, PurchasePaymentLine } from '../types'
import type { PurchaseInvoiceRecord } from '@shared/types/purchaseInvoice'

interface CompletePurchaseDialogProps {
  isOpen: boolean
  onClose: () => void
  supplier: SupplierRecord | null
  supplierInvoiceNumber: string
  items: PurchaseBillItem[]
  payments: PurchasePaymentLine[]
  summary: {
    grandTotal: number
    totalPaid: number
    balanceDue: number
  }
  isSubmitting: boolean
  error: string | null
  completedInvoice: PurchaseInvoiceRecord | null
  onConfirmPurchase: () => Promise<any>
  onNewPurchase: () => void
}

export const CompletePurchaseDialog: React.FC<CompletePurchaseDialogProps> = ({
  isOpen,
  onClose,
  supplier,
  supplierInvoiceNumber,
  items,
  payments,
  summary,
  isSubmitting,
  error,
  completedInvoice,
  onConfirmPurchase,
  onNewPurchase
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (completedInvoice) {
        nextBtnRef.current?.focus()
      } else {
        confirmBtnRef.current?.focus()
      }
    }
  }, [isOpen, completedInvoice])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (!isSubmitting) {
        onClose()
      }
    }
  }

  if (!isOpen) return null

  // Post-purchase success screen
  if (completedInvoice) {
    return (
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Inward Completed!</h2>
          <div className="text-sm text-slate-500 mt-1 font-mono">
            Purchase No: <span className="font-bold text-slate-800">{completedInvoice.invoiceNumber}</span>
          </div>

          <div className="my-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Supplier:</span>
              <span className="font-semibold text-slate-800">{supplier?.name}</span>
            </div>
            {supplierInvoiceNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier Ref:</span>
                <span className="font-mono text-slate-800">{supplierInvoiceNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Total Inward:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{completedInvoice.grandTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid Amount:</span>
              <span className="font-mono font-semibold text-emerald-700">
                ₹{completedInvoice.paidAmount.toLocaleString()}
              </span>
            </div>
            {completedInvoice.balanceDue > 0 && (
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-amber-800 font-bold">
                <span>Supplier Outstanding Payable:</span>
                <span className="font-mono">₹{completedInvoice.balanceDue.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print Inward Note</span>
            </button>
            <button
              ref={nextBtnRef}
              type="button"
              onClick={() => {
                onNewPurchase()
                onClose()
              }}
              className="flex-1 h-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>✨</span>
              <span>Next Inward (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Pre-purchase confirmation
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span>📥</span>
            <span>Confirm & Complete Purchase Invoice</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              ⚠️ {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-semibold text-slate-800 text-sm">{supplier?.name}</div>
            <div className="text-slate-500 flex gap-3 text-[11px]">
              {supplier?.mobile && <span>📞 {supplier.mobile}</span>}
              {supplierInvoiceNumber && <span>Ref No: {supplierInvoiceNumber}</span>}
              <span>📦 {items.length} item(s) to inward</span>
            </div>
          </div>

          <div className="space-y-1.5 border-y border-slate-100 py-3">
            <div className="flex justify-between font-bold text-sm text-slate-800">
              <span>Total Inward Cost:</span>
              <span className="font-mono text-amber-700 text-base">
                ₹{summary.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-slate-700">Payment Outflow:</div>
            {payments
              .filter((p) => p.amount > 0)
              .map((p, i) => (
                <div key={i} className="flex justify-between text-slate-500">
                  <span>
                    {p.paymentMethod} {p.paymentReference ? `(${p.paymentReference})` : ''}
                  </span>
                  <span className="font-mono font-medium text-slate-800">
                    ₹{p.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            {summary.balanceDue > 0 && (
              <div className="flex justify-between text-amber-800 font-bold pt-1">
                <span>Supplier Ledger Payable:</span>
                <span className="font-mono">₹{summary.balanceDue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirmPurchase}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Finalizing Inward & Ledger...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Confirm & Post Purchase (Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
