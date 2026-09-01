export type RepairOwnershipType = 'CUSTOMER_OWNED' | 'SHOP_OWNED'

export type RepairStatus =
  | 'RECEIVED'
  | 'ESTIMATE_PENDING'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'IN_REPAIR'
  | 'RECEIVED_FROM_KARIGAR'
  | 'QC_APPROVED'
  | 'QC_REJECTED'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export type RepairType =
  | 'Resizing'
  | 'Polishing'
  | 'Cleaning'
  | 'Stone Replacement'
  | 'Diamond Replacement'
  | 'Clasp Repair'
  | 'Chain Repair'
  | 'Ring Repair'
  | 'Bangle Repair'
  | 'Soldering'
  | 'Rhodium'
  | 'Plating'
  | 'Alteration'
  | 'Remaking'
  | 'Other'

export interface RepairJobRecord {
  id: string
  repairNumber: string
  customerId: string
  customerName: string
  customerMobile?: string | null
  ownershipType: RepairOwnershipType
  stockItemId?: string | null
  stockItemCode?: string | null
  barcode?: string | null
  customerItemDescription?: string | null
  metalType: string
  purityName: string
  repairType: RepairType
  status: RepairStatus
  priority: 'NORMAL' | 'URGENT' | 'HIGH'
  receivedDate: string
  expectedDeliveryDate?: string | null
  assignedKarigarId?: string | null
  karigarName?: string | null

  // Before Measurements
  beforeGrossWeight: number
  beforeNetWeight: number
  beforeFineWeight: number
  beforeStoneCount: number
  beforeDiamondCount: number
  intakeCondition?: string | null

  // After Measurements
  afterGrossWeight: number
  afterNetWeight: number
  afterFineWeight: number
  afterStoneCount: number
  afterDiamondCount: number
  weightDifference: number

  // Estimate & Approval
  estimateLabour: number
  estimateMaterial: number
  estimateStone: number
  estimateOther: number
  estimateTax: number
  estimateTotal: number
  isEstimateApproved: boolean
  approvedBy?: string | null
  approvalDate?: string | null

  // Material & Labour
  materialIssuedGross: number
  materialIssuedFine: number
  materialReturnedFine: number
  materialConsumedFine: number
  karigarLabourAmount: number

  // Charges & Payments
  finalRepairCharge: number
  advanceAdjusted: number
  amountPaid: number
  balanceDue: number
  paymentMethod: string
  paymentReference?: string | null

  // QC & Delivery
  qcStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  qcNotes?: string | null
  deliveredAt?: string | null
  deliveredBy?: string | null
  receivedBy?: string | null

  notes?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateRepairJobPayload {
  customerId: string
  ownershipType: RepairOwnershipType
  stockItemId?: string
  customerItemDescription?: string
  metalType?: string
  purityName?: string
  repairType: RepairType
  priority?: 'NORMAL' | 'URGENT' | 'HIGH'
  receivedDate?: string
  expectedDeliveryDate?: string
  beforeGrossWeight: number
  beforeNetWeight: number
  beforeFineWeight?: number
  beforeStoneCount?: number
  beforeDiamondCount?: number
  intakeCondition?: string
  estimateLabour?: number
  estimateMaterial?: number
  estimateStone?: number
  estimateOther?: number
  notes?: string
}

export interface AssignKarigarPayload {
  repairJobId: string
  karigarId: string
  expectedReturnDate?: string
  notes?: string
}

export interface RepairMaterialIssuePayload {
  repairJobId: string
  karigarId: string
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

export interface ReceiveFromKarigarPayload {
  repairJobId: string
  afterGrossWeight: number
  afterNetWeight: number
  afterStoneCount?: number
  afterDiamondCount?: number
  materialReturnedFine?: number
  materialConsumedFine?: number
  karigarLabourAmount?: number
  qcNotes?: string
}

export interface DeliverRepairPayload {
  repairJobId: string
  finalRepairCharge: number
  advanceAdjusted?: number
  amountPaid: number
  paymentMethod?: string
  paymentReference?: string
  deliveredBy?: string
  receivedBy?: string
  notes?: string
}

export interface RepairTimelineEventRecord {
  id: string
  repairJobId: string
  eventType: string
  description: string
  performedBy: string
  createdAt: string
}

export interface RepairDashboardSummary {
  receivedToday: number
  inRepair: number
  awaitingApproval: number
  awaitingQc: number
  readyForDelivery: number
  deliveredToday: number
  totalOutstandingAmount: number
}
