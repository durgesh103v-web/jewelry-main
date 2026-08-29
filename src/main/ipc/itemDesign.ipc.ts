import { createIpcHandler } from './wrapper'
import { itemDesignService } from '../services/itemDesign.service'

export function registerItemDesignIpc(): void {
  createIpcHandler('itemDesigns:list', () => {
    return itemDesignService.list()
  })

  createIpcHandler('itemDesigns:create', (_event, payload: any) => {
    return itemDesignService.create(payload)
  })

  createIpcHandler('itemDesigns:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return itemDesignService.update(payload.id, payload.payload)
    }
    return itemDesignService.update(payload?.id, payload)
  })

  createIpcHandler('itemDesigns:remove', (_event, id: any) => {
    return itemDesignService.delete(id)
  })

  createIpcHandler('itemDesigns:delete', (_event, id: any) => {
    return itemDesignService.delete(id)
  })
}
