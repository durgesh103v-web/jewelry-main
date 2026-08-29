import { defaultReceiptPrinter } from './receiptPrinter.adapter'
import type { PrintInvoiceOptions } from './device.types'

/**
 * High-level Invoice Print Service
 * Provides clean printing abstraction for POS and invoice views.
 */
export const invoicePrintService = {
  /**
   * Print a sales invoice by ID
   */
  async print(invoiceId: string, options?: PrintInvoiceOptions): Promise<boolean> {
    try {
      return await defaultReceiptPrinter.printInvoice(invoiceId, options)
    } catch (err) {
      console.error('Failed to print invoice:', err)
      return false
    }
  },

  /**
   * Print duplicate / customer copy of an invoice
   */
  async printDuplicate(invoiceId: string): Promise<boolean> {
    try {
      return await defaultReceiptPrinter.printDuplicate(invoiceId)
    } catch (err) {
      console.error('Failed to print duplicate invoice:', err)
      return false
    }
  }
}
