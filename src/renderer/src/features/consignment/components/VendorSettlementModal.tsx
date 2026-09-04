import React, { useState, useEffect, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import type {
  ConsignmentInwardRecord,
  SettleConsignmentPayload
} from '@shared/types/consignment'
import { formatDate, formatCurrency } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

export interface VendorSettlementModalProps {
  isOpen: boolean
  onClose: () => void
  inward: ConsignmentInwardRecord
  onSettlementSuccess: () => Promise<void> | void
}

type ModalStep = 'FORM' | 'CONFIRM' | 'SUCCESS'

type PaymentMethodType = 'CASH' | 'BANK' | 'UPI' | 'CARD' | 'CHEQUE'

interface PaymentMethodOption {
  value: PaymentMethodType
  label: string
  icon: string
  placeholder: string
  referenceLabel: string
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: 'CASH',
    label: 'Cash',
    icon: '💵',
    placeholder: 'Optional voucher / receipt no.',
    referenceLabel: 'Cash Receipt Ref'
  },
  {
    value: 'BANK',
    label: 'Bank Transfer (NEFT/RTGS)',
    icon: '🏦',
    placeholder: 'UTR / Transaction Reference No.',
    referenceLabel: 'Bank UTR / Txn ID'
  },
  {
    value: 'UPI',
    label: 'UPI / QR',
    icon: '📱',
    placeholder: 'UPI Reference ID / UTR No.',
    referenceLabel: 'UPI Transaction ID'
  },
  {
    value: 'CARD',
    label: 'Debit / Credit Card',
    icon: '💳',
    placeholder: 'Card Auth Code / Terminal Approval Ref',
    referenceLabel: 'Card Auth Code'
  },
  {
    value: 'CHEQUE',
    label: 'Cheque',
    icon: '📝',
    placeholder: 'Cheque No. & Issuing Bank',
    referenceLabel: 'Cheque Number'
  }
]

export const VendorSettlementModal: React.FC<VendorSettlementModalProps> = ({
  isOpen,
  onClose,
  inward,
  onSettlementSuccess
}) => {
  // Modal flow step
  const [step, setStep] = useState<ModalStep>('FORM')

  // Form Fields
  const outstandingLiability = inward.outstandingLiability ?? 0
  const [amountStr, setAmountStr] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH')
  const [paymentReference, setPaymentReference] = useState<string>('')
  const [settlementDate, setSettlementDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [notes, setNotes] = useState<string>('')

  // State flags
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Success result from backend
  const [settlementResult, setSettlementResult] = useState<{
    settlementId: string
    settlementNumber: string
    settledAmount: number
    paymentMethod: PaymentMethodType
    paymentReference: string
    settlementDate: string
  } | null>(null)

  const amountInputRef = useRef<HTMLInputElement>(null)

  // Initialize or reset form on open
  useEffect(() => {
    if (isOpen) {
      setStep('FORM')
      setAmountStr(outstandingLiability > 0 ? String(outstandingLiability) : '')
      setPaymentMethod('CASH')
      setPaymentReference('')
      setSettlementDate(dayjs().format('YYYY-MM-DD'))
      setNotes('')
      setError(null)
      setIsSubmitting(false)
      setSettlementResult(null)
      setTimeout(() => amountInputRef.current?.focus(), 100)
    }
  }, [isOpen, outstandingLiability])

  const parsedAmount = useMemo(() => {
    const num = parseFloat(amountStr)
    return isNaN(num) ? 0 : Number(num.toFixed(2))
  }, [amountStr])

  const isOverpaying = parsedAmount > outstandingLiability
  const isZeroOrNegative = parsedAmount <= 0

  // Selected payment method config
  const currentMethodConfig = useMemo(() => {
    return PAYMENT_METHODS.find((m) => m.value === paymentMethod) || PAYMENT_METHODS[0]
  }, [paymentMethod])

  // Preset percentage setters
  const handleSetAmount = (val: number) => {
    setAmountStr(String(Math.max(0, Number(val.toFixed(2)))))
    setError(null)
  }

  // Handle Proceed to Confirmation
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isZeroOrNegative) {
      setError('Please enter a valid settlement amount greater than ₹0.')
      return
    }

    setStep('CONFIRM')
  }

  // Handle Backend Settlement Submission
  const handleConfirmAndSettle = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const payload: SettleConsignmentPayload = {
        consignmentInwardId: inward.id,
        amount: parsedAmount,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        settlementDate,
        notes: notes.trim() || undefined
      }

      // Authoritative backend call via typed preload API
      const result = await window.api.consignment.settle(payload)

      setSettlementResult({
        settlementId: result.settlementId,
        settlementNumber: result.settlementNumber,
        settledAmount: parsedAmount,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        settlementDate
      })

      // Notify parent to refresh details
      await onSettlementSuccess()

      setStep('SUCCESS')
    } catch (err: unknown) {
      console.error('Failed to process consignment settlement:', err)
      setError(getFriendlyErrorMessage(err))
      setStep('FORM') // Return to form so operator can adjust amount or review
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-bold shadow-sm">
              💳
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {step === 'SUCCESS' ? 'Settlement Confirmation' : 'Vendor Consignment Settlement'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Memo #{inward.consignmentNumber} • {inward.supplierName}
              </p>
            </div>
          </div>

          {step !== 'SUCCESS' && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-40"
              title="Close modal"
            >
              ✕
            </button>
          )}
        </header>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex justify-between items-center shadow-sm">
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

          {/* STEP 1: FORM */}
          {step === 'FORM' && (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Financial Snapshot Card (Direct Authoritative Values) */}
              <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans uppercase font-semibold border-b border-border/60 pb-2">
                  <span>Authoritative Financial Position</span>
                  <span className="text-foreground">{inward.settlementStatus ?? 'UNSETTLED'}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-background/60 p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase block font-sans">
                      Recognized Payable
                    </span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(inward.totalSoldVendorCost ?? 0)}
                    </span>
                    <span className="text-[9px] text-muted-foreground block font-sans mt-0.5">
                      From sold pieces
                    </span>
                  </div>

                  <div className="bg-background/60 p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase block font-sans">
                      Settled to Date
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inward.totalSettledAmount ?? 0)}
                    </span>
                    <span className="text-[9px] text-muted-foreground block font-sans mt-0.5">
                      Prior payments
                    </span>
                  </div>

                  <div className="bg-background/60 p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase block font-sans">
                      Outstanding Due
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        outstandingLiability > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatCurrency(outstandingLiability)}
                    </span>
                    <span className="text-[9px] text-muted-foreground block font-sans mt-0.5">
                      Authoritative balance
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement Amount Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="settlement-amount-input" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Settlement Amount</span>
                    <span className="text-rose-500">*</span>
                  </label>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetAmount(outstandingLiability)}
                      className="px-2 py-0.5 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded transition-colors"
                      title="Settle total remaining outstanding balance"
                    >
                      Full Due (₹{outstandingLiability.toLocaleString()})
                    </button>
                    {outstandingLiability > 1000 && (
                      <button
                        type="button"
                        onClick={() => handleSetAmount(outstandingLiability / 2)}
                        className="px-2 py-0.5 text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-medium rounded transition-colors"
                      >
                        50% Due
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-muted-foreground text-sm font-bold">
                    ₹
                  </span>
                  <input
                    id="settlement-amount-input"
                    ref={amountInputRef}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value)
                      setError(null)
                    }}
                    placeholder="0.00"
                    required
                    className="w-full h-10 pl-8 pr-4 bg-background border border-input rounded-xl text-base font-bold font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  />
                </div>

                {/* Overpayment Early Warning (Advisory; backend rejects strictly) */}
                {isOverpaying && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                    <span>⚠️</span>
                    <span>
                      Amount exceeds remaining liability of {formatCurrency(outstandingLiability)}. Backend will reject overpayment.
                    </span>
                  </p>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = paymentMethod === method.value
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`py-2 px-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 border transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm ring-1 ring-primary'
                            : 'bg-background hover:bg-muted/50 border-input text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="text-base">{method.icon}</span>
                        <span className="text-[11px] leading-tight text-center">{method.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Payment Reference (Dynamic placeholder per method) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="settlement-ref-input" className="text-xs font-semibold text-foreground">
                    {currentMethodConfig.referenceLabel}
                    {paymentMethod !== 'CASH' && (
                      <span className="text-muted-foreground text-[10px] font-normal ml-1">
                        (Recommended for audit)
                      </span>
                    )}
                  </label>
                </div>
                <input
                  id="settlement-ref-input"
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={currentMethodConfig.placeholder}
                  className="w-full h-9 px-3 bg-background border border-input rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              {/* Settlement Date & Notes Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="settlement-date-input" className="text-xs font-semibold text-foreground">
                    Settlement Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="settlement-date-input"
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="settlement-notes-input" className="text-xs font-semibold text-foreground">
                    Narration / Notes
                  </label>
                  <input
                    id="settlement-notes-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional settlement remark..."
                    className="w-full h-9 px-3 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  />
                </div>
              </div>

              {/* Accounting Notice */}
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[11px]">
                ℹ️ <strong>Ledger Integration:</strong> Confirming settlement will post an atomic double-entry debit to <strong className="text-foreground">{inward.supplierName}</strong>'s ledger account and reduce recognized liability.
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl transition-colors border border-border"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isZeroOrNegative}
                  className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <span>Review Settlement ({formatCurrency(parsedAmount)})</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CONFIRMATION REVIEW */}
          {step === 'CONFIRM' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mx-auto mb-2 shadow-sm">
                  ✓
                </div>
                <h3 className="text-base font-bold text-foreground">Confirm Vendor Settlement</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Please review the transaction summary before posting to accounting ledgers.
                </p>
              </div>

              {/* Review Summary Breakdown */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Consignment Memo:</span>
                  <span className="font-bold text-foreground">{inward.consignmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Vendor / Supplier:</span>
                  <span className="font-semibold text-foreground">{inward.supplierName}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground font-sans">Outstanding Before Settle:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(outstandingLiability)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-1 bg-background/60 px-2 rounded-lg border border-border/80">
                  <span className="font-sans font-bold text-foreground">Settlement Amount:</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(parsedAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Payment Method:</span>
                  <span className="font-bold text-foreground">
                    {currentMethodConfig.icon} {currentMethodConfig.label}
                  </span>
                </div>
                {paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Payment Reference:</span>
                    <span className="font-mono text-foreground">{paymentReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Settlement Date:</span>
                  <span className="font-semibold text-foreground">{formatDate(settlementDate)}</span>
                </div>
                {notes && (
                  <div className="pt-2 border-t border-border/60 text-[11px]">
                    <span className="text-muted-foreground font-sans block text-[10px] uppercase">
                      Notes:
                    </span>
                    <span className="text-foreground italic">{notes}</span>
                  </div>
                )}
              </div>

              {/* Double-Entry Accounting Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-[11px]">
                ⚖️ <strong>Authoritative Accounting Posting:</strong> Confirming will atomically record this payment voucher, update memo settled totals, and debit supplier account ledger.
              </div>

              {/* Confirmation Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('FORM')}
                  className="h-9 px-4 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl transition-colors border border-border disabled:opacity-40"
                >
                  ← Back to Edit
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirmAndSettle()}
                  className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>Processing Settlement...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Post Settlement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS RESULT */}
          {step === 'SUCCESS' && settlementResult && (
            <div className="py-4 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-sm">
                ✓
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">
                  Vendor Settlement Recorded Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Payment voucher created and supplier ledger updated atomically.
                </p>
              </div>

              {/* Authoritative Settlement Voucher Summary */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border text-left font-mono text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Settlement Voucher #:</span>
                  <span className="font-bold text-primary text-sm">
                    {settlementResult.settlementNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Consignment Memo:</span>
                  <span className="font-bold text-foreground">{inward.consignmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Vendor / Consignor:</span>
                  <span className="font-semibold text-foreground">{inward.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Settled Amount:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(settlementResult.settledAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Payment Method:</span>
                  <span className="font-bold text-foreground">
                    {settlementResult.paymentMethod}
                  </span>
                </div>
                {settlementResult.paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Reference:</span>
                    <span className="font-mono text-foreground">
                      {settlementResult.paymentReference}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Settlement Date:</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(settlementResult.settlementDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-6 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
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

export default VendorSettlementModal
