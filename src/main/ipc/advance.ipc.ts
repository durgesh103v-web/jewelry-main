import { createIpcHandler } from './wrapper'
import { advanceService } from '../services/advance.service'

export function registerAdvanceIpc(): void {
  createIpcHandler('advances:list', (_event, filter?: any) => {
    return advanceService.list(filter)
  })

  createIpcHandler('advances:get-by-id', (_event, id: string) => {
    return advanceService.getById(id)
  })

  createIpcHandler('advances:get-by-number', (_event, number: string) => {
    return advanceService.getByNumber(number)
  })

  createIpcHandler('advances:get-by-customer', (_event, customerId: string) => {
    return advanceService.getByCustomer(customerId)
  })

  createIpcHandler('advances:get-by-order', (_event, orderId: string) => {
    return advanceService.getByOrder(orderId)
  })

  createIpcHandler('advances:next-number', () => {
    return advanceService.getNextNumber()
  })

  createIpcHandler('advances:receive', (_event, payload: any) => {
    return advanceService.receiveAdvance(payload)
  })

  createIpcHandler('advances:allocate', (_event, payload: any) => {
    return advanceService.allocateAdvance(payload)
  })

  createIpcHandler('advances:get-order-balance', (_event, orderId: string) => {
    return advanceService.getOrderAdvanceSummary(orderId)
  })

  createIpcHandler('advances:cancel', (_event, id: string) => {
    return advanceService.cancelAdvance(id)
  })

  createIpcHandler('advances:delete', (_event, id: string) => {
    return advanceService.delete(id)
  })
}
