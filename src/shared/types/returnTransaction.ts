import type { LabourRateType } from '../jewelleryFormula'
import type { PaymentMethod } from './advance'

export type ReturnType = 'SALES_RETURN' | 'PURCHASE_RETURN'
export type NoteType = 'CREDIT_NOTE' | 'DEBIT_NOTE'
export type ReturnStatus = 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface ReturnRefundRecord {
  id: string
  returnId: string
  paymentMethod: PaymentMethod
  amount: number
  paymentReference?: string | null
  refundDate: string
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface ReturnItemRecord {
  id: string
  returnId: string
  originalItemId: string
  itemId: string
  itemName?: string | null
  itemCode?: string | null
  description?: string | null
  stampId?: string | null
  designId?: string | null
  barcode?: string | null
  returnPcs: number
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

export interface ReturnRecord {
  id: string
  returnNumber: string
  returnType: ReturnType
  noteType: NoteType
  originalSalesInvoiceId?: string | null
  originalPurchaseInvoiceId?: string | null
  originalInvoiceNumber?: string | null
  customerId?: string | null
  customerName?: string | null
  supplierId?: string | null
  supplierName?: string | null
  accountId: string
  accountName?: string | null
  returnDate: string
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
  returnTotal: number
  refundAmount: number
  adjustmentAmount: number
  status: ReturnStatus
  reason?: string | null
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  items?: ReturnItemRecord[]
  refunds?: ReturnRefundRecord[]
}

export interface ReturnableInvoiceItem {
  invoiceItemId: string
  itemId: string
  itemName: string
  itemCode?: string
  description?: string
  stampId?: string
  designId?: string
  barcode?: string
  metalType: string
  purityName?: string
  tunch: number
  wastage: number
  goldRate: number
  labourRate: number
  labourRateType: LabourRateType
  originalPcs: number
  returnedPcs: number
  returnablePcs: number
  originalGrossWeight: number
  returnedGrossWeight: number
  returnableGrossWeight: number
  originalNetWeight: number
  originalFineWeight: number
  unitMetalValue: number
  unitMakingCharges: number
  unitStoneCharges: number
  unitDiamondCharges: number
  unitDiscount: number
  unitTax: number
  unitLineTotal: number
  taxPercent: number
  pricingBreakdown?: string
}

export interface ReturnItemPayload {
  originalItemId: string
  itemId: string
  description?: string
  stampId?: string
  designId?: string
  barcode?: string
  returnPcs: number
  grossWeight: number
  lessWeight?: number
}

export interface ReturnRefundPayload {
  paymentMethod: PaymentMethod
  amount: number
  paymentReference?: string
  notes?: string
}

export interface CreateReturnPayload {
  returnType: ReturnType
  originalInvoiceId: string
  returnDate?: string
  reason?: string
  notes?: string
  items: ReturnItemPayload[]
  refunds?: ReturnRefundPayload[]
}

export interface ReturnFilter {
  returnType?: ReturnType
  noteType?: NoteType
  customerId?: string
  supplierId?: string
  accountId?: string
  status?: ReturnStatus
  startDate?: string
  endDate?: string
  search?: string
}
