import { createIpcHandler } from './wrapper'
import { repairEntryService } from '../services/repairEntry.service'

export function registerRepairEntryIpc(): void {
  createIpcHandler('repair-entries:next-number', () => {
    return repairEntryService.getNextRepairNo()
  })

  createIpcHandler('repair-entries:create', (_event, payload: any) => {
    return repairEntryService.create(payload)
  })

  createIpcHandler('repair-entries:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return repairEntryService.update(payload.id, payload.payload)
    }
    return repairEntryService.update(id, payload)
  })

  createIpcHandler('repair-entries:list', () => {
    return repairEntryService.list()
  })

  createIpcHandler('repair-entries:get-by-id', (_event, id: string) => {
    return repairEntryService.getById(id)
  })

  createIpcHandler('repair-entries:delete', (_event, id: string) => {
    return repairEntryService.delete(id)
  })

  createIpcHandler('repair-entries:complete-repair', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return repairEntryService.completeRepair(payload.id, payload.payload)
    }
    return repairEntryService.completeRepair(id, payload)
  })

  createIpcHandler('repair-entries:mark-delivered', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return repairEntryService.markDelivered(payload.id, payload.payload)
    }
    return repairEntryService.markDelivered(id, payload)
  })
}
