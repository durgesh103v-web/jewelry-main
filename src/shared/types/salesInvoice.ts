import type { PaymentMethod } from './advance'

export type SalesInvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface SalesInvoicePaymentRecord {
  id: string
  invoiceId: string
  paymentMethod: PaymentMethod
  amount: number
  paymentReference?: string | null
  paymentDate: string
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface SalesInvoiceItemRecord {
  id: string
  invoiceId: string
  itemId: string
  itemName?: string | null
  itemCode?: string | null
  description: string
  stampId?: string | null
  designId?: string | null
  barcode?: string | null
  pcs: number
  grossWeight: number
  packWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  metalType: string
  purityName?: string | null
  tunch: number
  wastage: number
  fineWeight: number
  goldRate: number
  metalValue: number
  labourRate: number
  labourRateType: 'Kg' | 'Gm' | 'Pcs'
  makingCharges: number
  stoneCharges: number
  diamondCharges: number
  discountAmount: number
  taxableAmount: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
  pricingBreakdown: string
  createdAt: string
  updatedAt: string
}

export interface SalesInvoiceRecord {
  id: string
  invoiceNumber: string
  customerId?: string | null
  customerName?: string | null
  customerCode?: string | null
  customerPhone?: string | null
  accountId: string
  accountName?: string | null
  orderId?: string | null
  orderNumber?: string | null
  invoiceDate: string
  metalType: string
  totalPcs: number
  grossWeight: number
  netWeight: number
  fineWeight: number
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  oldGoldExchangeAmount: number
  advanceAmount: number
  roundOff: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  pricingSnapshot?: string | null
  status: SalesInvoiceStatus
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  items?: SalesInvoiceItemRecord[]
  payments?: SalesInvoicePaymentRecord[]
}

export interface SalesInvoiceItemPayload {
  itemId: string
  description?: string
  stampId?: string
  designId?: string
  barcode?: string
  pcs: number
  grossWeight: number
  packWeight?: number
  lessWeight?: number
  addWeight?: number
  metalType?: string
  purityName?: string
  tunch?: number
  wastage?: number
  goldRate?: number
  labourRate?: number
  labourRateType?: 'Kg' | 'Gm' | 'Pcs'
  stoneCharges?: number
  diamondCharges?: number
  discountAmount?: number
  discountPercent?: number
  taxPercent?: number
}

export interface SalesInvoicePaymentPayload {
  paymentMethod: PaymentMethod
  amount: number
  paymentReference?: string
  notes?: string
}

export interface SalesInvoicePayload {
  invoiceNumber?: string
  customerId?: string
  accountId: string
  orderId?: string
  invoiceDate?: string
  metalType?: string
  notes?: string
  advanceIds?: string[]
  metalExchangeIds?: string[]
  items: SalesInvoiceItemPayload[]
  payments?: SalesInvoicePaymentPayload[]
}

export interface SalesInvoiceFilter {
  search?: string
  customerId?: string
  accountId?: string
  orderId?: string
  status?: SalesInvoiceStatus
  metalType?: string
  startDate?: string
  endDate?: string
}
