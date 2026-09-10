import { createIpcHandler } from './wrapper'
import { itemGroupService } from '../services/itemGroup.service'

export function registerItemGroupIpc(): void {
  const handleList = () => {
    return itemGroupService.list()
  }
  createIpcHandler('itemGroups:list', handleList)
  createIpcHandler('item-groups:list', handleList)

  const handleCreate = (_event: any, payload: any) => {
    return itemGroupService.create(payload)
  }
  createIpcHandler('itemGroups:create', handleCreate)
  createIpcHandler('item-groups:create', handleCreate)

  const handleUpdate = (_event: any, payload: any, legacyPayload?: any) => {
    if (typeof payload === 'string' && legacyPayload) {
      return itemGroupService.update(payload, legacyPayload)
    }
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemGroupService.update(payload.id, payload.payload)
    }
    return itemGroupService.update(payload?.id, payload)
  }
  createIpcHandler('itemGroups:update', handleUpdate)
  createIpcHandler('item-groups:update', handleUpdate)

  const handleDelete = (_event: any, id: any) => {
    return itemGroupService.delete(id)
  }
  createIpcHandler('itemGroups:remove', handleDelete)
  createIpcHandler('itemGroups:delete', handleDelete)
  createIpcHandler('item-groups:remove', handleDelete)
  createIpcHandler('item-groups:delete', handleDelete)
}
