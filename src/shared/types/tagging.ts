export type StockItemStatus =
  | 'IN_STOCK'
  | 'RESERVED'
  | 'SOLD'
  | 'RETURNED'
  | 'REPAIR'
  | 'JOB_WORK'
  | 'TRANSFERRED'
  | 'LOST'
  | 'DAMAGED'

export type TagStatus = 'ACTIVE' | 'PRINTED' | 'REPRINTED' | 'REPLACED' | 'RETIRED'

export type ScanIdentifierType = 'BARCODE' | 'QR' | 'RFID' | 'STOCK_CODE' | 'SERIAL'

export interface JewelleryStockItemRecord {
  id: string
  stockItemCode: string
  itemId: string
  itemName: string
  itemCode?: string | null
  metalType: string
  categoryName?: string | null
  stampName?: string | null
  designName?: string | null
  barcode?: string | null
  qrCode?: string | null
  rfidEpc?: string | null
  serialNumber?: string | null
  grossWeight: number
  netWeight: number
  fineWeight: number
  purityName?: string | null
  tunch: number
  status: StockItemStatus
  location: string
  counter?: string | null
  tray?: string | null
  tagStatus: TagStatus
  lastScannedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateStockItemPayload {
  itemId: string
  barcode?: string
  qrCode?: string
  rfidEpc?: string
  serialNumber?: string
  grossWeight: number
  netWeight: number
  fineWeight?: number
  purityName?: string
  tunch?: number
  location?: string
  counter?: string
  tray?: string
}

export interface ScanResult {
  success: boolean
  identifierType: ScanIdentifierType
  identifierValue: string
  stockItem?: JewelleryStockItemRecord | null
  isEligibleForOperation: boolean
  operationStatus: string
  message: string
}

export interface StockTakeSessionRecord {
  id: string
  sessionNumber: string
  location: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  totalExpected: number
  totalScanned: number
  totalMatched: number
  totalMissing: number
  totalUnexpected: number
  notes?: string | null
  createdBy: string
  createdAt: string
  completedAt?: string | null
}

export interface StockTakeScanRecord {
  id: string
  sessionId: string
  stockItemId?: string | null
  stockItemCode?: string | null
  itemName?: string | null
  identifierType: ScanIdentifierType
  identifierValue: string
  scanResult: 'MATCHED' | 'MISSING' | 'UNEXPECTED' | 'WRONG_LOCATION' | 'WRONG_STATUS'
  scannedAt: string
  operator: string
}

export interface StockTakeSummary {
  session: StockTakeSessionRecord
  scans: StockTakeScanRecord[]
  missingItems: JewelleryStockItemRecord[]
}

export interface TagPrintItem {
  stockItemId: string
  stockItemCode: string
  itemName: string
  barcode: string
  qrCode?: string | null
  metalType: string
  purityName: string
  grossWeight: number
  netWeight: number
  copies: number
}

export interface RfidTagReadEvent {
  epc: string
  readerId?: string
  antenna?: number
  rssi?: number
  timestamp: string
}

export interface ItemTimelineEvent {
  date: string
  eventType: string
  documentNumber?: string | null
  description: string
  performedBy?: string | null
  statusAfter: StockItemStatus
}
