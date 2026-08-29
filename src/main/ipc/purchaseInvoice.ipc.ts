import { createIpcHandler } from './wrapper'
import { purchaseInvoiceService } from '../services/purchaseInvoice.service'
import type {
  PurchaseInvoicePayload,
  PurchaseInvoiceFilter
} from '../../shared/types/purchaseInvoice'

export function registerPurchaseInvoiceIpc(): void {
  createIpcHandler('purchase-invoices:list', (_event, filter?: PurchaseInvoiceFilter) => {
    return purchaseInvoiceService.list(filter)
  })

  createIpcHandler('purchase-invoices:get-by-id', (_event, id: string) => {
    return purchaseInvoiceService.getById(id)
  })

  createIpcHandler('purchase-invoices:get-by-number', (_event, invoiceNumber: string) => {
    return purchaseInvoiceService.getByNumber(invoiceNumber)
  })

  createIpcHandler('purchase-invoices:next-number', () => {
    return purchaseInvoiceService.getNextNumber()
  })

  createIpcHandler('purchase-invoices:create', (_event, payload: PurchaseInvoicePayload) => {
    return purchaseInvoiceService.create(payload)
  })

  createIpcHandler('purchase-invoices:cancel', (_event, id: string) => {
    return purchaseInvoiceService.cancel(id)
  })

  createIpcHandler('purchase-invoices:delete', (_event, id: string) => {
    return purchaseInvoiceService.delete(id)
  })
}
