export type ConsignmentStatus = 'ACTIVE' | 'PARTIALLY_SETTLED' | 'COMPLETED' | 'CLOSED'

export type ConsignmentItemStatus = 'IN_SHOWROOM' | 'SOLD' | 'RETURNED'

export interface ConsignmentInwardRecord {
  id: string
  consignmentNumber: string
  supplierId: string
  supplierName?: string
  supplierMobile?: string
  inwardDate: string
  expectedReturnDate?: string | null
  status: ConsignmentStatus
  totalPieces: number
  totalGrossWeight: number
  totalVendorCost: number
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  items?: ConsignmentItemRecord[]
}

export interface ConsignmentItemRecord {
  id: string
  consignmentInwardId: string
  consignmentNumber?: string
  supplierId: string
  supplierName?: string
  stockItemId: string
  stockItemCode?: string
  barcode?: string
  itemId: string
  itemName?: string
  itemCode?: string
  vendorItemCode?: string
  grossWeight: number
  netWeight: number
  fineWeight: number
  purityName: string
  tunch: number
  vendorCost: number
  retailPrice: number
  status: ConsignmentItemStatus
  salesInvoiceId?: string | null
  salesInvoiceNumber?: string | null
  soldAt?: string | null
  returnedAt?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ConsignmentReturnRecord {
  id: string
  returnNumber: string
  consignmentInwardId: string
  consignmentNumber?: string
  supplierId: string
  supplierName?: string
  returnDate: string
  totalPieces: number
  totalGrossWeight: number
  notes?: string
  createdAt: string
  returnedItems?: Array<{
    id: string
    consignmentItemId: string
    stockItemId: string
    barcode?: string
    itemName?: string
    grossWeight: number
  }>
}

export interface CreateConsignmentItemLine {
  itemId: string
  vendorItemCode?: string
  grossWeight: number
  netWeight: number
  fineWeight?: number
  purityName?: string
  tunch?: number
  vendorCost: number
  retailPrice?: number
  counter?: string
  tray?: string
  notes?: string
}

export interface CreateConsignmentInwardPayload {
  supplierId: string
  inwardDate: string
  expectedReturnDate?: string
  notes?: string
  items: CreateConsignmentItemLine[]
}

export interface ReturnConsignmentItemsPayload {
  consignmentInwardId: string
  consignmentItemIds: string[]
  returnDate: string
  notes?: string
}

export interface ConsignmentDashboardSummary {
  activeConsignmentsCount: number
  piecesInShowroomCount: number
  totalShowroomGrossWeight: number
  totalShowroomVendorValue: number
  piecesSoldTotal: number
  totalSettlementDueToSuppliers: number
  piecesReturnedTotal: number
  overdueMemosCount: number
}
