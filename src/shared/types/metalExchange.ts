export type ExchangeStatus = 'CONFIRMED' | 'APPLIED' | 'CANCELLED'

export interface MetalExchangeRecord {
  id: string
  exchangeNumber: string
  oldGoldReceiptId: string
  oldGoldReceiptNumber?: string | null
  customerId?: string | null
  customerName?: string | null
  customerCode?: string | null
  accountId: string
  accountName?: string | null
  orderId?: string | null
  orderNumber?: string | null
  saleId?: string | null
  exchangeDate: string
  exchangeAmount: number
  status: ExchangeStatus
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface MetalExchangePayload {
  exchangeNumber?: string
  oldGoldReceiptId: string
  customerId?: string
  accountId: string
  orderId?: string
  saleId?: string
  exchangeDate?: string
  exchangeAmount: number
  notes?: string
}

export interface MetalExchangeFilter {
  search?: string
  oldGoldReceiptId?: string
  customerId?: string
  accountId?: string
  orderId?: string
  status?: ExchangeStatus
  startDate?: string
  endDate?: string
}
