import { createIpcHandler } from './wrapper'
import { supplierService } from '../services/supplier.service'

export function registerSupplierIpc(): void {
  createIpcHandler('suppliers:list', (_event, filter?: any) => {
    return supplierService.list(filter)
  })

  createIpcHandler('suppliers:search', (_event, query: string, limit?: number) => {
    return supplierService.search(query, limit)
  })

  createIpcHandler('suppliers:get-by-id', (_event, id: string) => {
    return supplierService.getById(id)
  })

  createIpcHandler('suppliers:get-by-code', (_event, code: string) => {
    return supplierService.getByCode(code)
  })

  createIpcHandler('suppliers:get-balance', (_event, id: string) => {
    return supplierService.getBalance(id)
  })

  createIpcHandler('suppliers:next-code', () => {
    return supplierService.getNextCode()
  })

  createIpcHandler('suppliers:create', (_event, payload: any) => {
    return supplierService.create(payload)
  })

  createIpcHandler('suppliers:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return supplierService.update(payload.id, payload.payload)
    }
    return supplierService.update(id, payload)
  })

  createIpcHandler('suppliers:delete', (_event, id: string) => {
    return supplierService.delete(id)
  })
}
