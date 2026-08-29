import { createIpcHandler } from './wrapper'
import { oldGoldService } from '../services/oldGold.service'

export function registerOldGoldIpc(): void {
  createIpcHandler('old-gold:calculate-valuation', (_event, request: any) => {
    return oldGoldService.calculateValuation(request)
  })

  createIpcHandler('old-gold:list', (_event, filter?: any) => {
    return oldGoldService.list(filter)
  })

  createIpcHandler('old-gold:get-by-id', (_event, id: string) => {
    return oldGoldService.getById(id)
  })

  createIpcHandler('old-gold:get-by-number', (_event, number: string) => {
    return oldGoldService.getByNumber(number)
  })

  createIpcHandler('old-gold:get-by-customer', (_event, customerId: string) => {
    return oldGoldService.getByCustomer(customerId)
  })

  createIpcHandler('old-gold:next-number', () => {
    return oldGoldService.getNextNumber()
  })

  createIpcHandler('old-gold:create-receipt', (_event, payload: any) => {
    return oldGoldService.createReceipt(payload)
  })

  createIpcHandler('old-gold:cancel-receipt', (_event, id: string) => {
    return oldGoldService.cancelReceipt(id)
  })

  createIpcHandler('old-gold:delete', (_event, id: string) => {
    return oldGoldService.delete(id)
  })
}
