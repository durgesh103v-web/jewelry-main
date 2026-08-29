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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
            ✓
          </div>
          <h2 className="text-xl font-bold text-foreground">Purchase Inward Completed!</h2>
          <div className="text-sm text-muted-foreground mt-1 font-mono">
            Purchase No: <span className="font-bold text-foreground">{completedInvoice.invoiceNumber}</span>
          </div>

          <div className="my-5 p-3.5 bg-muted/40 rounded-xl border border-border text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier:</span>
              <span className="font-semibold text-foreground">{supplier?.name}</span>
            </div>
            {supplierInvoiceNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier Ref:</span>
                <span className="font-mono text-foreground">{supplierInvoiceNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Inward:</span>
              <span className="font-mono font-bold text-foreground">
                ₹{completedInvoice.grandTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Amount:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{completedInvoice.paidAmount.toLocaleString()}
              </span>
            </div>
            {completedInvoice.balanceDue > 0 && (
              <div className="flex justify-between border-t border-border/60 pt-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <span>Supplier Outstanding Payable:</span>
                <span className="font-mono">₹{completedInvoice.balanceDue.toLocaleString()}</span>
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
              <span>Print Inward Note</span>
            </button>
            <button
              ref={nextBtnRef}
              type="button"
              onClick={() => {
                onNewPurchase()
                onClose()
              }}
              className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <span>📥</span>
            <span>Confirm & Complete Purchase Invoice</span>
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
            <div className="font-semibold text-foreground text-sm">{supplier?.name}</div>
            <div className="text-muted-foreground flex gap-3 text-[11px]">
              {supplier?.mobile && <span>📞 {supplier.mobile}</span>}
              {supplierInvoiceNumber && <span>Ref No: {supplierInvoiceNumber}</span>}
              <span>📦 {items.length} item(s) to inward</span>
            </div>
          </div>

          <div className="space-y-1.5 border-y border-border/60 py-3">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>Total Inward Cost:</span>
              <span className="font-mono text-primary">
                ₹{summary.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-foreground">Payment Outflow:</div>
            {payments
              .filter((p) => p.amount > 0)
              .map((p, i) => (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>
                    {p.paymentMethod} {p.paymentReference ? `(${p.paymentReference})` : ''}
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    ₹{p.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            {summary.balanceDue > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold pt-1">
                <span>Supplier Ledger Payable:</span>
                <span className="font-mono">₹{summary.balanceDue.toLocaleString()}</span>
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
            onClick={onConfirmPurchase}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold rounded-xl shadow-sm flex items-center gap-2"
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
