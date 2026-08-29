import { createIpcHandler } from './wrapper'
import { saleService } from '../services/sale.service'

export function registerSaleIpc(): void {
  createIpcHandler('sales:next-number', () => {
    return saleService.getNextSaleNo()
  })

  createIpcHandler('sales:account-balance', (_event, accountId: any) => {
    return saleService.getAccountBalance(accountId)
  })

  createIpcHandler('sales:create', (_event, payload: any) => {
    return saleService.create(payload as any)
  })

  createIpcHandler('sales:list', () => {
    return saleService.list()
  })

  createIpcHandler('sales:get-by-id', (_event, id: any) => {
    return saleService.getById(id)
  })

  createIpcHandler('sales:cancel', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload) {
      return saleService.cancel(payload.id, payload.reason)
    }
    return saleService.cancel(payload)
  })

  createIpcHandler('sales:list-all-for-delete', () => {
    return saleService.listAllForDelete()
  })
}
