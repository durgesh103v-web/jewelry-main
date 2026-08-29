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
    <div className="p-3.5 bg-card border border-border rounded-xl shadow-sm text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <span>💳</span>
          <span>Payment Collection (F6)</span>
        </span>
        <button
          type="button"
          onClick={onAddPayment}
          className="text-xs px-2 py-0.5 text-primary hover:bg-primary/10 rounded font-medium transition-colors"
        >
          + Add Split Payment
        </button>
      </div>

      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
            <select
              value={p.paymentMethod}
              onChange={(e) => onUpdatePayment(p.id, { paymentMethod: e.target.value as PaymentMethod })}
              className="h-8 text-xs bg-background border border-input rounded px-2 font-medium"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2 text-muted-foreground text-[11px]">₹</span>
              <input
                type="number"
                min="0"
                value={p.amount || ''}
                onChange={(e) => onUpdatePayment(p.id, { amount: Number(e.target.value) || 0 })}
                placeholder="Amount"
                className="w-full h-8 pl-6 pr-2 text-xs font-mono font-bold bg-background border border-input rounded focus:ring-1 focus:ring-primary"
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
                className="w-32 h-8 px-2 text-xs bg-background border border-input rounded placeholder:text-muted-foreground font-mono"
              />
            )}

            {payments.length > 1 && (
              <button
                type="button"
                onClick={() => onRemovePayment(p.id)}
                className="text-muted-foreground hover:text-destructive text-sm px-1"
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
