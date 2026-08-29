export const PAYMENT_METHODS = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card'
} as const

export type PaymentMethodConstant = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]

export const PAYMENT_METHOD_OPTIONS: PaymentMethodConstant[] = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.UPI,
  PAYMENT_METHODS.BANK_TRANSFER,
  PAYMENT_METHODS.CHEQUE,
  PAYMENT_METHODS.CREDIT_CARD,
  PAYMENT_METHODS.DEBIT_CARD
]
