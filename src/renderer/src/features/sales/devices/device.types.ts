/**
 * POS Device Abstraction Interfaces & Types
 * Designed for future hardware drivers (USB/HID/Serial/Bluetooth/Network).
 * Hardware drivers are NOT implemented in this phase.
 */

export type DeviceConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'UNAVAILABLE'

export interface DeviceInfo {
  id: string
  name: string
  type: 'BARCODE_SCANNER' | 'WEIGHING_SCALE' | 'RECEIPT_PRINTER' | 'CASH_DRAWER'
  status: DeviceConnectionStatus
  model?: string
  portOrAddress?: string
}

/**
 * Barcode Scanner Adapter Abstraction
 */
export interface BarcodeScanEvent {
  barcode: string
  symbology?: string
  timestamp: number
}

export interface BarcodeScannerAdapter {
  readonly deviceInfo: DeviceInfo
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  onScan(listener: (event: BarcodeScanEvent) => void): () => void
}

/**
 * Weighing Scale Adapter Abstraction
 */
export interface WeightReadingEvent {
  grossWeight: number
  netWeight?: number
  tareWeight?: number
  unit: 'g' | 'kg' | 'oz' | 'tola'
  isStable: boolean
  timestamp: number
}

export interface WeighingScaleAdapter {
  readonly deviceInfo: DeviceInfo
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  readWeight(): Promise<WeightReadingEvent>
  onWeightChange(listener: (event: WeightReadingEvent) => void): () => void
  zeroScale(): Promise<boolean>
  tareScale(): Promise<boolean>
}

/**
 * Receipt Printer Adapter Abstraction
 */
export interface PrintInvoiceOptions {
  copies?: number
  headerLogo?: boolean
  cutPaper?: boolean
  drawerKick?: boolean
}

export interface ReceiptPrinterAdapter {
  readonly deviceInfo: DeviceInfo
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  printInvoice(invoiceId: string, options?: PrintInvoiceOptions): Promise<boolean>
  printDuplicate(invoiceId: string): Promise<boolean>
  openCashDrawer(): Promise<boolean>
  getStatus(): Promise<DeviceConnectionStatus>
}

/**
 * Cash Drawer Adapter Abstraction
 */
export interface CashDrawerAdapter {
  readonly deviceInfo: DeviceInfo
  open(): Promise<boolean>
  isOpen(): Promise<boolean | null>
}
