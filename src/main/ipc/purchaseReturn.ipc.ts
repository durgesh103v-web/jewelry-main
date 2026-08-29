import { createIpcHandler } from './wrapper'
import { purchaseReturnService } from '../services/purchaseReturn.service'

export function registerPurchaseReturnIpc(): void {
  createIpcHandler('purchase-returns:next-number', () => {
    return purchaseReturnService.getNextPurchaseReturnNo()
  })

  createIpcHandler('purchase-returns:account-balance', (_event, accountId: string) => {
    return purchaseReturnService.getAccountBalance(accountId)
  })

  createIpcHandler('purchase-returns:create', (_event, payload: any) => {
    return purchaseReturnService.create(payload)
  })

  createIpcHandler('purchase-returns:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return purchaseReturnService.update(payload.id, payload.payload)
    }
    return purchaseReturnService.update(id, payload)
  })

  createIpcHandler('purchase-returns:list', () => {
    return purchaseReturnService.list()
  })

  createIpcHandler('purchase-returns:get-by-id', (_event, id: string) => {
    return purchaseReturnService.getById(id)
  })

  createIpcHandler('purchase-returns:delete', (_event, id: string) => {
    return purchaseReturnService.delete(id)
  })
}
