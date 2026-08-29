import { createIpcHandler } from './wrapper'
import { salesInvoiceService } from '../services/salesInvoice.service'

export function registerSalesInvoiceIpc(): void {
  createIpcHandler('sales-invoices:list', (_event, filter?: any) => {
    return salesInvoiceService.list(filter)
  })

  createIpcHandler('sales-invoices:get-by-id', (_event, id: string) => {
    return salesInvoiceService.getById(id)
  })

  createIpcHandler('sales-invoices:get-by-number', (_event, number: string) => {
    return salesInvoiceService.getByNumber(number)
  })

  createIpcHandler('sales-invoices:next-number', () => {
    return salesInvoiceService.getNextInvoiceNumber()
  })

  createIpcHandler('sales-invoices:create', (_event, payload: any) => {
    return salesInvoiceService.createInvoice(payload)
  })

  createIpcHandler('sales-invoices:cancel', (_event, id: string) => {
    return salesInvoiceService.cancelInvoice(id)
  })

  createIpcHandler('sales-invoices:delete', (_event, id: string) => {
    return salesInvoiceService.delete(id)
  })
}
