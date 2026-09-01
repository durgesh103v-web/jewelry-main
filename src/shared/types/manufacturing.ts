export type ManufacturingOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'MATERIAL_ISSUED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'

export type KarigarSpecialization =
  | 'General'
  | 'Casting'
  | 'Setting'
  | 'Polishing'
  | 'Stone Setting'
  | 'Diamond Setting'
  | 'Handmade'
  | 'Chain'
  | 'Meena'
  | 'Repair'
  | 'Finishing'

export interface KarigarRecord {
  id: string
  karigarCode: string
  name: string
  mobile?: string | null
  address?: string | null
  specialization: string
  accountId?: string | null
  accountName?: string | null
  fineGoldBalance: number
  fineSilverBalance: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateKarigarPayload {
  name: string
  mobile?: string
  address?: string
  specialization?: string
  accountId?: string
}

export interface ManufacturingOrderRecord {
  id: string
  orderNumber: string
  designId?: string | null
  designName?: string | null
  itemId: string
  itemName: string
  karigarId: string
  karigarName: string
  plannedPcs: number
  plannedGrossWeight: number
  plannedNetWeight: number
  metalType: string
  purityName: string
  targetFineWeight: number
  expectedDeliveryDate?: string | null
  status: ManufacturingOrderStatus
  totalIssuedGross: number
  totalIssuedFine: number
  totalReturnedFine: number
  totalFinishedFine: number
  totalApprovedLoss: number
  unreconciledFine: number
  notes?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateManufacturingOrderPayload {
  itemId: string
  karigarId: string
  designId?: string
  plannedPcs: number
  plannedGrossWeight: number
  plannedNetWeight: number
  metalType: string
  purityName: string
  targetFineWeight?: number
  expectedDeliveryDate?: string
  notes?: string
}

export interface MaterialIssuePayload {
  orderId: string
  karigarId: string
  issueType?: 'INITIAL' | 'ADDITIONAL'
  metalType: string
  purityName: string
  tunch: number
  grossWeight: number
  netWeight: number
  fineWeight?: number
  stoneWeight?: number
  stonePcs?: number
  diamondCarats?: number
  diamondPcs?: number
  issueDate?: string
  notes?: string
}

export interface MaterialIssueRecord {
  id: string
  issueNumber: string
  orderId: string
  orderNumber: string
  karigarId: string
  karigarName: string
  issueType: 'INITIAL' | 'ADDITIONAL'
  metalType: string
  purityName: string
  tunch: number
  grossWeight: number
  netWeight: number
  fineWeight: number
  stoneWeight: number
  stonePcs: number
  diamondCarats: number
  diamondPcs: number
  issueDate: string
  notes?: string | null
  createdAt: string
}

export interface MaterialReturnPayload {
  orderId: string
  karigarId: string
  metalType: string
  grossWeight: number
  netWeight: number
  fineWeight: number
  returnDate?: string
  notes?: string
}

export interface MaterialReturnRecord {
  id: string
  returnNumber: string
  orderId: string
  orderNumber: string
  karigarId: string
  karigarName: string
  metalType: string
  grossWeight: number
  netWeight: number
  fineWeight: number
  returnDate: string
  notes?: string | null
  createdAt: string
}

export interface FinishedReceiptPayload {
  orderId: string
  karigarId: string
  itemId: string
  pcs: number
  grossWeight: number
  lessWeight?: number
  netWeight: number
  purityName: string
  tunch: number
  wastagePercent?: number
  actualWastageWeight?: number
  processLossWeight?: number
  scrapWeight?: number
  labourRate: number
  labourRateType: 'Gm' | 'Pcs' | 'Kg'
  qcStatus?: 'APPROVED' | 'REJECTED' | 'REWORK'
  receiptDate?: string
  notes?: string
}

export interface FinishedReceiptRecord {
  id: string
  receiptNumber: string
  orderId: string
  orderNumber: string
  karigarId: string
  karigarName: string
  itemId: string
  itemName: string
  stockItemId?: string | null
  stockItemCode?: string | null
  barcode?: string | null
  pcs: number
  grossWeight: number
  lessWeight: number
  netWeight: number
  fineWeight: number
  purityName: string
  tunch: number
  wastagePercent: number
  actualWastageWeight: number
  processLossWeight: number
  scrapWeight: number
  labourRate: number
  labourRateType: string
  labourAmount: number
  qcStatus: string
  receiptDate: string
  notes?: string | null
  createdAt: string
}

export interface KarigarMetalLedgerRecord {
  id: string
  karigarId: string
  karigarName: string
  entryDate: string
  metalType: string
  documentType: string
  documentId: string
  documentNumber: string
  fineIssued: number
  fineReturned: number
  fineReceived: number
  approvedLoss: number
  runningFineBalance: number
  narration?: string | null
  createdAt: string
}

export interface KarigarSettlementPayload {
  karigarId: string
  settlementDate?: string
  settlementType: 'CASH' | 'BANK' | 'METAL' | 'ADJUSTMENT'
  amountPaid?: number
  fineMetalSettled?: number
  paymentReference?: string
  notes?: string
}

export interface KarigarSettlementRecord {
  id: string
  settlementNumber: string
  karigarId: string
  karigarName: string
  settlementDate: string
  settlementType: string
  amountPaid: number
  fineMetalSettled: number
  paymentReference?: string | null
  notes?: string | null
  createdAt: string
}

export interface ManufacturingReconciliationSummary {
  order: ManufacturingOrderRecord
  materialIssues: MaterialIssueRecord[]
  materialReturns: MaterialReturnRecord[]
  receipts: FinishedReceiptRecord[]
  totalFineIssued: number
  totalFineReturned: number
  totalFineReceived: number
  totalApprovedLoss: number
  unreconciledDifference: number
  isReconciled: boolean
}
