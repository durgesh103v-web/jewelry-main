import { createIpcHandler } from './wrapper'
import { saleReturnService } from '../services/saleReturn.service'

export function registerSaleReturnIpc(): void {
  createIpcHandler('sale-returns:next-number', () => {
    return saleReturnService.getNextSaleReturnNo()
  })

  createIpcHandler('sale-returns:account-balance', (_event, accountId: string) => {
    return saleReturnService.getAccountBalance(accountId)
  })

  createIpcHandler('sale-returns:create', (_event, payload: any) => {
    return saleReturnService.create(payload)
  })

  createIpcHandler('sale-returns:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return saleReturnService.update(payload.id, payload.payload)
    }
    return saleReturnService.update(id, payload)
  })

  createIpcHandler('sale-returns:list', () => {
    return saleReturnService.list()
  })

  createIpcHandler('sale-returns:get-by-id', (_event, id: string) => {
    return saleReturnService.getById(id)
  })

  createIpcHandler('sale-returns:delete', (_event, id: string) => {
    return saleReturnService.delete(id)
  })
}
