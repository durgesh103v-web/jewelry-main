import { createIpcHandler } from './wrapper'
import { itemOpeningStockService } from '../services/itemOpeningStock.service'

export function registerItemOpeningStockIpc(): void {
  const handleList = () => {
    return itemOpeningStockService.list()
  }
  createIpcHandler('itemOpeningStock:list', handleList)
  createIpcHandler('item-opening-stock:list', handleList)

  const handleCreate = (_event: any, payload: any) => {
    return itemOpeningStockService.create(payload)
  }
  createIpcHandler('itemOpeningStock:create', handleCreate)
  createIpcHandler('item-opening-stock:create', handleCreate)

  const handleUpdate = (_event: any, payload: any, legacyPayload?: any) => {
    if (typeof payload === 'string' && legacyPayload) {
      return itemOpeningStockService.update(payload, legacyPayload)
    }
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemOpeningStockService.update(payload.id, payload.payload)
    }
    return itemOpeningStockService.update(payload?.id, payload)
  }
  createIpcHandler('itemOpeningStock:update', handleUpdate)
  createIpcHandler('item-opening-stock:update', handleUpdate)

  const handleDelete = (_event: any, id: any) => {
    return itemOpeningStockService.delete(id)
  }
  createIpcHandler('itemOpeningStock:remove', handleDelete)
  createIpcHandler('itemOpeningStock:delete', handleDelete)
  createIpcHandler('item-opening-stock:remove', handleDelete)
  createIpcHandler('item-opening-stock:delete', handleDelete)
}

