export type PaymentMethod = 'CASH' | 'BANK' | 'UPI' | 'CARD' | 'CHEQUE' | 'OTHER'

export type AdvanceStatus =
  | 'RECEIVED'
  | 'PARTIALLY_ALLOCATED'
  | 'FULLY_ALLOCATED'
  | 'REFUNDED'
  | 'CANCELLED'

export interface AdvanceAllocationRecord {
  id: string
  advanceId: string
  orderId: string
  orderNumber?: string | null
  allocatedAmount: number
  allocationDate: string
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface CustomerAdvanceRecord {
  id: string
  advanceNumber: string
  customerId?: string | null
  customerName?: string | null
  customerCode?: string | null
  accountId: string
  accountName?: string | null
  orderId?: string | null
  orderNumber?: string | null
  amount: number
  allocatedAmount: number
  unallocatedAmount: number
  paymentMethod: PaymentMethod
  paymentReference?: string | null
  advanceDate: string
  status: AdvanceStatus
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  allocations?: AdvanceAllocationRecord[]
}

export interface CustomerAdvancePayload {
  advanceNumber?: string
  customerId?: string
  accountId: string
  orderId?: string
  amount: number
  paymentMethod?: PaymentMethod
  paymentReference?: string
  advanceDate?: string
  notes?: string
}

export interface AdvanceAllocationPayload {
  advanceId: string
  orderId: string
  allocatedAmount: number
  notes?: string
}

export interface CustomerAdvanceFilter {
  search?: string
  customerId?: string
  accountId?: string
  orderId?: string
  status?: AdvanceStatus
  paymentMethod?: PaymentMethod
  startDate?: string
  endDate?: string
}

export interface OrderAdvanceSummary {
  orderId: string
  orderNumber: string
  grandTotal: number
  totalAdvanceReceived: number
  totalAdvanceAllocated: number
  balanceDue: number
  advances: CustomerAdvanceRecord[]
}
