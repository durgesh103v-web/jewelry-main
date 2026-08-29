import { createIpcHandler } from './wrapper'
import { itemStampService } from '../services/itemStamp.service'

export function registerItemStampIpc(): void {
  createIpcHandler('itemStamps:list', () => {
    return itemStampService.list()
  })

  createIpcHandler('itemStamps:create', (_event, payload: any) => {
    return itemStampService.create(payload)
  })

  createIpcHandler('itemStamps:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemStampService.update(payload.id, payload.payload)
    }
    return itemStampService.update(payload?.id, payload)
  })

  createIpcHandler('itemStamps:remove', (_event, id: any) => {
    return itemStampService.delete(id)
  })

  createIpcHandler('itemStamps:delete', (_event, id: any) => {
    return itemStampService.delete(id)
  })
}
