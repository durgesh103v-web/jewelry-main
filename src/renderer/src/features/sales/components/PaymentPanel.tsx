import React from 'react'
import type { PosPaymentLine } from '../types'
import type { PaymentMethod } from '../../../../../shared/types/advance'

interface PaymentPanelProps {
  payments: PosPaymentLine[]
  netPayable?: number
  onAddPayment: () => void
  onUpdatePayment: (id: string, updates: Partial<PosPaymentLine>) => void
  onRemovePayment: (id: string) => void
}

const PAYMENT_METHODS: Array<{ label: string; value: PaymentMethod }> = [
  { label: '💵 Cash', value: 'CASH' },
  { label: '📱 UPI / QR', value: 'UPI' },
  { label: '💳 Card', value: 'CARD' },
  { label: '🏦 Bank Transfer', value: 'BANK' },
  { label: '📝 Cheque', value: 'CHEQUE' },
  { label: 'Other', value: 'OTHER' }
]

export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  payments,
  onAddPayment,
  onUpdatePayment,
  onRemovePayment
}) => {
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <span>💳</span>
          <span>Payment Collection</span>
        </span>
        <button
          type="button"
          onClick={onAddPayment}
          className="text-xs px-2 py-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded font-bold transition-colors cursor-pointer"
        >
          + Add Split Payment
        </button>
      </div>

      <div className="space-y-1.5">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <select
              value={p.paymentMethod}
              onChange={(e) => onUpdatePayment(p.id, { paymentMethod: e.target.value as PaymentMethod })}
              className="h-8 text-xs bg-white border border-slate-200 rounded px-1.5 font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2 text-slate-400 text-[11px] font-bold">₹</span>
              <input
                type="number"
                min="0"
                value={p.amount || ''}
                onChange={(e) => onUpdatePayment(p.id, { amount: Number(e.target.value) || 0 })}
                placeholder="Amount"
                className="w-full h-8 pl-6 pr-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded focus:border-amber-500 focus:outline-none text-slate-900"
              />
            </div>

            {p.paymentMethod !== 'CASH' && (
              <input
                type="text"
                value={p.paymentReference || ''}
                onChange={(e) => onUpdatePayment(p.id, { paymentReference: e.target.value })}
                placeholder={
                  p.paymentMethod === 'UPI'
                    ? 'UTR / Ref No'
                    : p.paymentMethod === 'CHEQUE'
                      ? 'Cheque No'
                      : 'Auth / Ref No'
                }
                className="w-28 h-8 px-2 text-xs bg-white border border-slate-200 rounded placeholder:text-slate-400 font-mono text-slate-800 focus:border-amber-500 focus:outline-none"
              />
            )}

            {payments.length > 1 && (
              <button
                type="button"
                onClick={() => onRemovePayment(p.id)}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded text-sm px-1.5 py-1 cursor-pointer transition-colors"
                title="Remove split line"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
