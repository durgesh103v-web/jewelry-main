import { createIpcHandler } from './wrapper'
import { itemOpeningStockService } from '../services/itemOpeningStock.service'

export function registerItemOpeningStockIpc(): void {
  createIpcHandler('itemOpeningStock:list', () => {
    return itemOpeningStockService.list()
  })

  createIpcHandler('itemOpeningStock:create', (_event, payload: any) => {
    return itemOpeningStockService.create(payload)
  })

  createIpcHandler('itemOpeningStock:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemOpeningStockService.update(payload.id, payload.payload)
    }
    return itemOpeningStockService.update(payload?.id, payload)
  })

  createIpcHandler('itemOpeningStock:remove', (_event, id: any) => {
    return itemOpeningStockService.delete(id)
  })

  createIpcHandler('itemOpeningStock:delete', (_event, id: any) => {
    return itemOpeningStockService.delete(id)
  })
}
