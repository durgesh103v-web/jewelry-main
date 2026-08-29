import { createIpcHandler } from './wrapper'
import { settlementService } from '../services/settlement.service'

export function registerSettlementIpc(): void {
  createIpcHandler('settlements:next-number', () => {
    return settlementService.getNextNumber()
  })

  createIpcHandler('settlements:create', (_event, payload: any) => {
    return settlementService.create(payload)
  })

  createIpcHandler('settlements:list', () => {
    return settlementService.list()
  })

  createIpcHandler('settlements:get-by-id', (_event, id: string) => {
    return settlementService.getById(id)
  })

  createIpcHandler('settlements:delete', (_event, id: string) => {
    return settlementService.delete(id)
  })
}
