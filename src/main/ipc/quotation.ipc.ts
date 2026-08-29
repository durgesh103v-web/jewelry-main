import { createIpcHandler } from './wrapper'
import { quotationService } from '../services/quotation.service'

export function registerQuotationIpc(): void {
  createIpcHandler('quotations:list', (_event, filter?: any) => {
    return quotationService.list(filter)
  })

  createIpcHandler('quotations:get-by-id', (_event, id: string) => {
    return quotationService.getById(id)
  })

  createIpcHandler('quotations:get-by-number', (_event, number: string) => {
    return quotationService.getByNumber(number)
  })

  createIpcHandler('quotations:next-number', () => {
    return quotationService.getNextNumber()
  })

  createIpcHandler('quotations:create', (_event, payload: any) => {
    return quotationService.create(payload)
  })

  createIpcHandler('quotations:update-status', (_event, payload: any) => {
    if (payload && typeof payload === 'object') {
      return quotationService.updateStatus(payload.id, payload.status)
    }
    return null
  })

  createIpcHandler('quotations:convert-to-order', (_event, quotationId: string) => {
    return quotationService.convertToOrder(quotationId)
  })

  createIpcHandler('quotations:delete', (_event, id: string) => {
    return quotationService.delete(id)
  })
}
