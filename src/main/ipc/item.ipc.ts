import { createIpcHandler } from './wrapper'
import { itemService } from '../services/item.service'

export function registerItemIpc(): void {
  createIpcHandler('items:list', () => {
    return itemService.list()
  })

  createIpcHandler('items:create', (_event, payload: any) => {
    return itemService.create(payload as any)
  })

  createIpcHandler('items:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemService.update(payload.id, payload.payload as any)
    }
    return itemService.update(payload?.id, payload as any)
  })

  createIpcHandler('items:delete', (_event, id: any) => {
    return itemService.delete(id)
  })

  createIpcHandler('items:assignBarcode', (_event, id: any) => {
    return itemService.assignBarcode(id)
  })

  createIpcHandler('items:regenerateBarcode', (_event, id: any) => {
    return itemService.regenerateBarcode(id)
  })
}
