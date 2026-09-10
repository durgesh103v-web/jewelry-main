import { createIpcHandler } from './wrapper'
import { itemStampService } from '../services/itemStamp.service'

export function registerItemStampIpc(): void {
  const handleList = () => {
    return itemStampService.list()
  }
  createIpcHandler('itemStamps:list', handleList)
  createIpcHandler('item-stamps:list', handleList)

  const handleCreate = (_event: any, payload: any) => {
    return itemStampService.create(payload)
  }
  createIpcHandler('itemStamps:create', handleCreate)
  createIpcHandler('item-stamps:create', handleCreate)

  const handleUpdate = (_event: any, payload: any, legacyPayload?: any) => {
    if (typeof payload === 'string' && legacyPayload) {
      return itemStampService.update(payload, legacyPayload)
    }
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemStampService.update(payload.id, payload.payload)
    }
    return itemStampService.update(payload?.id, payload)
  }
  createIpcHandler('itemStamps:update', handleUpdate)
  createIpcHandler('item-stamps:update', handleUpdate)

  const handleDelete = (_event: any, id: any) => {
    return itemStampService.delete(id)
  }
  createIpcHandler('itemStamps:remove', handleDelete)
  createIpcHandler('itemStamps:delete', handleDelete)
  createIpcHandler('item-stamps:remove', handleDelete)
  createIpcHandler('item-stamps:delete', handleDelete)
}
