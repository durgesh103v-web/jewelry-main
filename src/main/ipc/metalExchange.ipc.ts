import { createIpcHandler } from './wrapper'
import { metalExchangeService } from '../services/metalExchange.service'

export function registerMetalExchangeIpc(): void {
  createIpcHandler('exchanges:list', (_event, filter?: any) => {
    return metalExchangeService.list(filter)
  })

  createIpcHandler('exchanges:get-by-id', (_event, id: string) => {
    return metalExchangeService.getById(id)
  })

  createIpcHandler('exchanges:get-by-number', (_event, number: string) => {
    return metalExchangeService.getByNumber(number)
  })

  createIpcHandler('exchanges:get-by-order', (_event, orderId: string) => {
    return metalExchangeService.getByOrder(orderId)
  })

  createIpcHandler('exchanges:next-number', () => {
    return metalExchangeService.getNextNumber()
  })

  createIpcHandler('exchanges:apply', (_event, payload: any) => {
    return metalExchangeService.applyExchange(payload)
  })

  createIpcHandler('exchanges:cancel', (_event, id: string) => {
    return metalExchangeService.cancelExchange(id)
  })

  createIpcHandler('exchanges:delete', (_event, id: string) => {
    return metalExchangeService.delete(id)
  })
}
