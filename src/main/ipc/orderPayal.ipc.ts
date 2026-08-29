import { createIpcHandler } from './wrapper'
import { orderPayalService } from '../services/orderPayal.service'

export function registerOrderPayalIpc(): void {
  createIpcHandler('order-payal:next-number', () => {
    return orderPayalService.getNextNumber()
  })

  createIpcHandler('order-payal:create', (_event, payload: any) => {
    return orderPayalService.create(payload)
  })

  createIpcHandler('order-payal:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return orderPayalService.update(payload.id, payload.payload)
    }
    return orderPayalService.update(id, payload)
  })

  createIpcHandler('order-payal:list', () => {
    return orderPayalService.list()
  })

  createIpcHandler('order-payal:get-by-id', (_event, id: string) => {
    return orderPayalService.getById(id)
  })

  createIpcHandler('order-payal:mark-delivered', (_event, id: string) => {
    return orderPayalService.markDelivered(id)
  })

  createIpcHandler('order-payal:delete', (_event, id: string) => {
    return orderPayalService.delete(id)
  })
}
