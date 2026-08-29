import type {
  ReceiptPrinterAdapter,
  DeviceInfo,
  PrintInvoiceOptions,
  DeviceConnectionStatus
} from './device.types'

/**
 * Standard Receipt Printer Adapter
 * Uses browser window printing by default, ready for future ESC/POS thermal printer bridges.
 */
export class BrowserReceiptPrinterAdapter implements ReceiptPrinterAdapter {
  public readonly deviceInfo: DeviceInfo = {
    id: 'printer-system',
    name: 'System Default Printer / Thermal Bridge',
    type: 'RECEIPT_PRINTER',
    status: 'CONNECTED',
    model: 'System Document / Receipt'
  }

  public async connect(): Promise<boolean> {
    return true
  }

  public async disconnect(): Promise<void> {
    // No-op for system printer
  }

  public async printInvoice(_invoiceId: string, _options?: PrintInvoiceOptions): Promise<boolean> {
    if (typeof window !== 'undefined') {
      window.print()
      return true
    }
    return false
  }

  public async printDuplicate(invoiceId: string): Promise<boolean> {
    return this.printInvoice(invoiceId)
  }

  public async openCashDrawer(): Promise<boolean> {
    // Drawer kick signal placeholder
    return false
  }

  public async getStatus(): Promise<DeviceConnectionStatus> {
    return 'CONNECTED'
  }
}

export const defaultReceiptPrinter = new BrowserReceiptPrinterAdapter()
