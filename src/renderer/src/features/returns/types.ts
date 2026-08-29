import type {
  ReturnType,
  ReturnRecord,
  ReturnableInvoiceItem,
  ReturnItemPayload,
  ReturnRefundPayload
} from '@shared/types/returnTransaction'

export type ReturnLifecycleStage =
  | 'SELECT_INVOICE'
  | 'SELECT_ITEMS'
  | 'ITEMS_SELECTED'
  | 'REFUND_ENTRY'
  | 'CONFIRMATION'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ERROR'

export interface SelectedReturnItem extends ReturnItemPayload {
  itemName: string
  itemCode?: string
  originalPcs: number
  returnablePcs: number
  originalGrossWeight: number
  returnableGrossWeight: number
  unitLineTotal: number
  calculatedLineTotal: number
  metalType: string
  goldRate: number
  purityName?: string
}

export interface ReturnState {
  returnType: ReturnType
  lifecycleStage: ReturnLifecycleStage
  originalInvoice: any | null
  returnableItems: ReturnableInvoiceItem[]
  selectedItems: SelectedReturnItem[]
  refunds: (ReturnRefundPayload & { id: string })[]
  reason: string
  notes: string
  isSubmitting: boolean
  error: string | null
  completedReturn: ReturnRecord | null
}
