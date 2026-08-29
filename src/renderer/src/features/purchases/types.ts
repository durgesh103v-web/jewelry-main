import type {
  PurchaseInvoiceItemPayload,
  PurchaseInvoicePaymentPayload,
  PurchaseInvoiceRecord
} from '@shared/types/purchaseInvoice'
import type { SupplierRecord } from '@shared/types/supplier'
import type { PricingResult } from '@shared/types/pricing'

export type ItemPricingStatus = 'CALCULATING' | 'READY' | 'ERROR'

export type PurchaseLifecycleStage =
  | 'EMPTY'
  | 'SUPPLIER_SELECTED'
  | 'ITEMS_ADDED'
  | 'PRICED'
  | 'READY_FOR_PAYMENT'
  | 'PAYMENT_ENTRY'
  | 'CHECKOUT_CONFIRMATION'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ERROR'

export interface PurchaseBillItem extends PurchaseInvoiceItemPayload {
  id: string
  itemName: string
  itemCode?: string
  pricingResult?: PricingResult
  pricingStatus?: ItemPricingStatus
  pricingError?: string
}

export interface PurchasePaymentLine extends PurchaseInvoicePaymentPayload {
  id: string
}

export interface PurchaseBillingState {
  lifecycleStage: PurchaseLifecycleStage
  supplier: SupplierRecord | null
  supplierInvoiceNumber: string
  items: PurchaseBillItem[]
  payments: PurchasePaymentLine[]
  metalType: string
  notes: string
  isCalculating: boolean
  isSubmitting: boolean
  error: string | null
  completedInvoice: PurchaseInvoiceRecord | null
}
