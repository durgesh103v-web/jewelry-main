import { createIpcHandler } from './wrapper'
import { itemDesignService } from '../services/itemDesign.service'

export function registerItemDesignIpc(): void {
  const handleList = () => {
    return itemDesignService.list()
  }
  createIpcHandler('itemDesigns:list', handleList)
  createIpcHandler('item-designs:list', handleList)

  const handleCreate = (_event: any, payload: any) => {
    return itemDesignService.create(payload)
  }
  createIpcHandler('itemDesigns:create', handleCreate)
  createIpcHandler('item-designs:create', handleCreate)

  const handleUpdate = (_event: any, payload: any, legacyPayload?: any) => {
    if (typeof payload === 'string' && legacyPayload) {
      return itemDesignService.update(payload, legacyPayload)
    }
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemDesignService.update(payload.id, payload.payload)
    }
    return itemDesignService.update(payload?.id, payload)
  }
  createIpcHandler('itemDesigns:update', handleUpdate)
  createIpcHandler('item-designs:update', handleUpdate)

  const handleDelete = (_event: any, id: any) => {
    return itemDesignService.delete(id)
  }
  createIpcHandler('itemDesigns:remove', handleDelete)
  createIpcHandler('itemDesigns:delete', handleDelete)
  createIpcHandler('item-designs:remove', handleDelete)
  createIpcHandler('item-designs:delete', handleDelete)
}
