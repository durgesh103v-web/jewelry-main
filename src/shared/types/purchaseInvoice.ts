import type { LabourRateType } from '../jewelleryFormula'
import type { PaymentMethod } from './advance'

export type PurchaseInvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface PurchaseInvoicePaymentRecord {
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

export interface PurchaseInvoiceItemRecord {
  id: string
  invoiceId: string
  itemId: string
  itemName?: string | null
  itemCode?: string | null
  description?: string | null
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
  labourRateType: LabourRateType
  makingCharges: number
  stoneCharges: number
  diamondCharges: number
  discountAmount: number
  taxableAmount: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
  pricingBreakdown?: string | null
  createdAt: string
  updatedAt: string
}

export interface PurchaseInvoiceRecord {
  id: string
  invoiceNumber: string
  supplierId?: string | null
  supplierName?: string | null
  supplierCode?: string | null
  accountId: string
  accountName?: string | null
  supplierInvoiceNumber?: string | null
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
  roundOff: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  pricingSnapshot?: string | null
  status: PurchaseInvoiceStatus
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  items?: PurchaseInvoiceItemRecord[]
  payments?: PurchaseInvoicePaymentRecord[]
}

export interface PurchaseInvoiceItemPayload {
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
  labourRateType?: LabourRateType
  stoneCharges?: number
  diamondCharges?: number
  discountAmount?: number
  discountPercent?: number
  taxPercent?: number
}

export interface PurchaseInvoicePaymentPayload {
  paymentMethod: PaymentMethod
  amount: number
  paymentReference?: string
  notes?: string
}

export interface PurchaseInvoicePayload {
  supplierId?: string
  accountId: string
  supplierInvoiceNumber?: string
  invoiceDate?: string
  metalType?: string
  notes?: string
  items: PurchaseInvoiceItemPayload[]
  payments?: PurchaseInvoicePaymentPayload[]
}

export interface PurchaseInvoiceFilter {
  supplierId?: string
  accountId?: string
  metalType?: string
  status?: PurchaseInvoiceStatus
  startDate?: string
  endDate?: string
  search?: string
}
