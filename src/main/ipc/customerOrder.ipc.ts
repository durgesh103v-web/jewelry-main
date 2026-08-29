import { createIpcHandler } from './wrapper'
import { customerOrderService } from '../services/customerOrder.service'

export function registerCustomerOrderIpc(): void {
  createIpcHandler('orders:list', (_event, filter?: any) => {
    return customerOrderService.list(filter)
  })

  createIpcHandler('orders:get-by-id', (_event, id: string) => {
    return customerOrderService.getById(id)
  })

  createIpcHandler('orders:get-by-number', (_event, number: string) => {
    return customerOrderService.getByNumber(number)
  })

  createIpcHandler('orders:next-number', () => {
    return customerOrderService.getNextNumber()
  })

  createIpcHandler('orders:create', (_event, payload: any) => {
    return customerOrderService.create(payload)
  })

  createIpcHandler('orders:update-status', (_event, payload: any) => {
    if (payload && typeof payload === 'object') {
      return customerOrderService.updateStatus(payload.id, payload.status)
    }
    return null
  })

  createIpcHandler('orders:delete', (_event, id: string) => {
    return customerOrderService.delete(id)
  })
}
