import React, { useEffect, useRef } from 'react'
import type { CustomerRecord } from '@shared/types/customer'
import type { PosBillItem, PosPaymentLine } from '../types'
import type { SalesInvoiceRecord } from '@shared/types/salesInvoice'
import { invoicePrintService } from '../devices/invoicePrint.service'

interface CompleteSaleDialogProps {
  isOpen: boolean
  onClose: () => void
  customer: CustomerRecord | null
  items: PosBillItem[]
  payments: PosPaymentLine[]
  summary: {
    grandTotal: number
    advanceDeducted: number
    exchangeDeducted: number
    invoiceDiscount?: number
    netPayable: number
    totalPaid: number
    balanceDue: number
  }
  isSubmitting: boolean
  error: string | null
  completedInvoice: SalesInvoiceRecord | null
  onConfirmSale: () => Promise<any>
  onNewSale: () => void
}

export const CompleteSaleDialog: React.FC<CompleteSaleDialogProps> = ({
  isOpen,
  onClose,
  customer,
  items,
  payments,
  summary,
  isSubmitting,
  error,
  completedInvoice,
  onConfirmSale,
  onNewSale
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const nextSaleBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (completedInvoice) {
        nextSaleBtnRef.current?.focus()
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

  // Post-sale success screen
  if (completedInvoice) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 font-bold">
            ✓
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Sale Completed Successfully!</h2>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            Invoice No: <span className="font-bold text-slate-900">{completedInvoice.invoiceNumber}</span>
          </div>

          <div className="my-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{customer?.name}</span>
            </div>
            {completedInvoice.salespersonName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Attendant:</span>
                <span className="font-semibold text-slate-800">{completedInvoice.salespersonName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Total Bill:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{completedInvoice.grandTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid Amount:</span>
              <span className="font-mono font-bold text-emerald-700">
                ₹{completedInvoice.paidAmount.toLocaleString()}
              </span>
            </div>
            {completedInvoice.balanceDue > 0 && (
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-amber-800 font-bold">
                <span>Customer Ledger Receivable:</span>
                <span className="font-mono">₹{completedInvoice.balanceDue.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => invoicePrintService.print(completedInvoice.id)}
              className="flex-1 h-10 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print Tax Invoice</span>
            </button>
            <button
              ref={nextSaleBtnRef}
              type="button"
              onClick={() => {
                onNewSale()
                onClose()
              }}
              className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 !text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <span>✨</span>
              <span className="!text-white" style={{ color: '#ffffff' }}>Next Sale (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Pre-sale confirmation
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>🧾</span>
            <span>Confirm & Complete Sales Invoice</span>
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
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-bold text-slate-900 text-sm">{customer?.name}</div>
            <div className="text-slate-500 flex gap-3 text-[11px]">
              {customer?.mobile && <span>📞 {customer.mobile}</span>}
              <span>📦 {items.length} item(s) to checkout</span>
            </div>
          </div>

          <div className="space-y-1.5 border-y border-slate-200 py-3">
            <div className="flex justify-between text-slate-600">
              <span>Invoice Subtotal:</span>
              <span className="font-mono text-slate-900 font-bold">
                ₹{summary.grandTotal.toLocaleString()}
              </span>
            </div>
            {summary.advanceDeducted > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Advance Deductions:</span>
                <span className="font-mono font-bold">
                  -₹{summary.advanceDeducted.toLocaleString()}
                </span>
              </div>
            )}
            {summary.exchangeDeducted > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Old Gold Exchange Credits:</span>
                <span className="font-mono font-bold">
                  -₹{summary.exchangeDeducted.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
              <span>Net Payable:</span>
              <span className="font-mono text-amber-700 font-extrabold text-base">
                ₹{summary.netPayable.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-700 uppercase text-[11px]">Payment Allocation:</div>
            {payments
              .filter((p) => p.amount > 0)
              .map((p, i) => (
                <div key={i} className="flex justify-between text-slate-600">
                  <span>
                    {p.paymentMethod} {p.paymentReference ? `(${p.paymentReference})` : ''}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{p.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            {summary.balanceDue > 0 && (
              <div className="flex justify-between text-amber-800 font-bold pt-1">
                <span>Customer Ledger Receivable:</span>
                <span className="font-mono">₹{summary.balanceDue.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-10 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Back to POS
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={onConfirmSale}
              disabled={isSubmitting}
              className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 !text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ color: '#ffffff' }}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="!text-white">Processing Bill...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Confirm & Generate Bill</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
