import { createIpcHandler } from './wrapper'
import { customerService } from '../services/customer.service'

export function registerCustomerIpc(): void {
  createIpcHandler('customers:list', (_event, filter?: any) => {
    return customerService.list(filter)
  })

  createIpcHandler('customers:search', (_event, query: string, limit?: number) => {
    return customerService.search(query, limit)
  })

  createIpcHandler('customers:get-by-id', (_event, id: string) => {
    return customerService.getById(id)
  })

  createIpcHandler('customers:get-by-code', (_event, code: string) => {
    return customerService.getByCode(code)
  })

  createIpcHandler('customers:get-balance', (_event, id: string) => {
    return customerService.getBalance(id)
  })

  createIpcHandler('customers:next-code', () => {
    return customerService.getNextCode()
  })

  createIpcHandler('customers:create', (_event, payload: any) => {
    return customerService.create(payload)
  })

  createIpcHandler('customers:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return customerService.update(payload.id, payload.payload)
    }
    return customerService.update(id, payload)
  })

  createIpcHandler('customers:delete', (_event, id: string) => {
    return customerService.delete(id)
  })
}
