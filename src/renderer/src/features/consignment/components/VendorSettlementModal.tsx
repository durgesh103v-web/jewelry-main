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
      setStep('FORM')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto text-xs">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-lg font-bold shadow-2xs">
              💳
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {step === 'SUCCESS' ? 'Settlement Confirmation' : 'Vendor Consignment Settlement'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Memo #{inward.consignmentNumber} • {inward.supplierName}
              </p>
            </div>
          </div>

          {step !== 'SUCCESS' && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-40"
              title="Close modal"
            >
              ✕
            </button>
          )}
        </header>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)] bg-slate-50/50">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex justify-between items-center shadow-2xs font-medium">
              <span className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-rose-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: FORM */}
          {step === 'FORM' && (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Financial Snapshot Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 text-xs shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase font-bold border-b border-slate-100 pb-2">
                  <span>Authoritative Financial Position</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {inward.settlementStatus ?? 'UNSETTLED'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Recognized Payable
                    </span>
                    <span className="text-sm font-bold text-purple-700">
                      {formatCurrency(inward.totalSoldVendorCost ?? 0)}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      From sold pieces
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Settled to Date
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatCurrency(inward.totalSettledAmount ?? 0)}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Prior payments
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Outstanding Due
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        outstandingLiability > 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(outstandingLiability)}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Authoritative balance
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement Amount Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="settlement-amount-input" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span>Settlement Amount</span>
                    <span className="text-rose-500">*</span>
                  </label>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetAmount(outstandingLiability)}
                      className="px-2 py-0.5 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded border border-amber-200 transition-colors"
                      title="Settle total remaining outstanding balance"
                    >
                      Full Due (₹{outstandingLiability.toLocaleString()})
                    </button>
                    {outstandingLiability > 1000 && (
                      <button
                        type="button"
                        onClick={() => handleSetAmount(outstandingLiability / 2)}
                        className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-200 transition-colors"
                      >
                        50% Due
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">
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
                    className="w-full h-10 pl-8 pr-4 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                {/* Overpayment Early Warning */}
                {isOverpaying && (
                  <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                    <span>⚠️</span>
                    <span>
                      Amount exceeds remaining liability of {formatCurrency(outstandingLiability)}. Backend will reject overpayment.
                    </span>
                  </p>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
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
                            ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold ring-1 ring-amber-400 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                        }`}
                      >
                        <span className="text-base">{method.icon}</span>
                        <span className="text-[11px] leading-tight text-center">{method.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Payment Reference */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="settlement-ref-input" className="text-xs font-semibold text-slate-700">
                    {currentMethodConfig.referenceLabel}
                    {paymentMethod !== 'CASH' && (
                      <span className="text-slate-400 text-[10px] font-normal ml-1">
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
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs font-mono"
                />
              </div>

              {/* Settlement Date & Notes Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="settlement-date-input" className="text-xs font-semibold text-slate-700">
                    Settlement Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="settlement-date-input"
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="settlement-notes-input" className="text-xs font-semibold text-slate-700">
                    Narration / Notes
                  </label>
                  <input
                    id="settlement-notes-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional settlement remark..."
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Accounting Notice */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-[11px] leading-relaxed">
                ℹ️ <strong>Ledger Integration:</strong> Confirming settlement will post an atomic double-entry debit to <strong className="text-slate-900">{inward.supplierName}</strong>'s ledger account and reduce recognized liability.
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300 shadow-2xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isZeroOrNegative}
                  style={{ color: '#ffffff' }}
                  className="h-9 px-5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 !text-white text-xs font-bold rounded-lg transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <span>Review Settlement ({formatCurrency(parsedAmount)})</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CONFIRMATION REVIEW */}
          {step === 'CONFIRM' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-xl mx-auto mb-2 shadow-2xs">
                  ✓
                </div>
                <h3 className="text-base font-bold text-slate-900">Confirm Vendor Settlement</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Please review the transaction summary before posting to accounting ledgers.
                </p>
              </div>

              {/* Review Summary Breakdown */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consignment Memo:</span>
                  <span className="font-bold text-slate-900">{inward.consignmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor / Supplier:</span>
                  <span className="font-semibold text-slate-900">{inward.supplierName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-500">Outstanding Before Settle:</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(outstandingLiability)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-1.5 bg-emerald-50 px-3 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900">Settlement Amount:</span>
                  <span className="text-base font-black text-emerald-700">
                    {formatCurrency(parsedAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-900">
                    {currentMethodConfig.icon} {currentMethodConfig.label}
                  </span>
                </div>
                {paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Reference:</span>
                    <span className="font-mono text-slate-900">{paymentReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Date:</span>
                  <span className="font-semibold text-slate-900">{formatDate(settlementDate)}</span>
                </div>
                {notes && (
                  <div className="pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">
                      Notes:
                    </span>
                    <span className="text-slate-700 italic">{notes}</span>
                  </div>
                )}
              </div>

              {/* Double-Entry Accounting Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] leading-relaxed">
                ⚖️ <strong>Authoritative Accounting Posting:</strong> Confirming will atomically record this payment voucher, update memo settled totals, and debit supplier account ledger.
              </div>

              {/* Confirmation Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('FORM')}
                  className="h-9 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300 shadow-2xs disabled:opacity-40"
                >
                  ← Back to Edit
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirmAndSettle()}
                  style={{ color: '#ffffff' }}
                  className="h-9 px-5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 !text-white text-xs font-bold rounded-lg transition-all shadow-2xs flex items-center gap-2 disabled:opacity-50"
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
            <div className="py-4 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-2xl mx-auto shadow-2xs">
                ✓
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Vendor Settlement Recorded Successfully!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Payment voucher created and supplier ledger updated atomically.
                </p>
              </div>

              {/* Authoritative Settlement Voucher Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Voucher #:</span>
                  <span className="font-bold text-amber-700 text-sm">
                    {settlementResult.settlementNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consignment Memo:</span>
                  <span className="font-bold text-slate-900">{inward.consignmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor / Consignor:</span>
                  <span className="font-semibold text-slate-900">{inward.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settled Amount:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatCurrency(settlementResult.settledAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-900">
                    {settlementResult.paymentMethod}
                  </span>
                </div>
                {settlementResult.paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference:</span>
                    <span className="font-mono text-slate-900">
                      {settlementResult.paymentReference}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Date:</span>
                  <span className="font-semibold text-slate-900">
                    {formatDate(settlementResult.settlementDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  style={{ color: '#ffffff' }}
                  className="h-9 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
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

