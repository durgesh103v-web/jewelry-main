import { createIpcHandler } from './wrapper'
import { purchaseService } from '../services/purchase.service'

export function registerPurchaseIpc(): void {
  createIpcHandler('purchases:next-number', () => {
    return purchaseService.getNextPurchaseNo()
  })

  createIpcHandler('purchases:account-balance', (_event, accountId: any) => {
    return purchaseService.getAccountBalance(accountId)
  })

  createIpcHandler('purchases:create', (_event, payload: any) => {
    return purchaseService.create(payload as any)
  })

  createIpcHandler('purchases:list', () => {
    return purchaseService.list()
  })

  createIpcHandler('purchases:get-by-id', (_event, id: any) => {
    return purchaseService.getById(id)
  })

  createIpcHandler('purchases:cancel', (_event, id: any) => {
    return purchaseService.cancel(id)
  })
}
