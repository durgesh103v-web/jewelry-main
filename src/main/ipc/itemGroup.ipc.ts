import { createIpcHandler } from './wrapper'
import { itemGroupService } from '../services/itemGroup.service'

export function registerItemGroupIpc(): void {
  createIpcHandler('itemGroups:list', () => {
    return itemGroupService.list()
  })

  createIpcHandler('itemGroups:create', (_event, payload: any) => {
    return itemGroupService.create(payload)
  })

  createIpcHandler('itemGroups:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemGroupService.update(payload.id, payload.payload)
    }
    return itemGroupService.update(payload?.id, payload)
  })

  createIpcHandler('itemGroups:remove', (_event, id: any) => {
    return itemGroupService.delete(id)
  })

  createIpcHandler('itemGroups:delete', (_event, id: any) => {
    return itemGroupService.delete(id)
  })
}
