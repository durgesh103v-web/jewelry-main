import { createIpcHandler } from './wrapper'
import { estimateService } from '../services/estimate.service'

export function registerEstimateIpc(): void {
  createIpcHandler('estimates:next-number', () => {
    return estimateService.getNextEstimateNo()
  })

  createIpcHandler('estimates:create', (_event, payload: any) => {
    return estimateService.create(payload)
  })

  createIpcHandler('estimates:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return estimateService.update(payload.id, payload.payload)
    }
    return estimateService.update(id, payload)
  })

  createIpcHandler('estimates:list', () => {
    return estimateService.list()
  })

  createIpcHandler('estimates:get-by-id', (_event, id: string) => {
    return estimateService.getById(id)
  })

  createIpcHandler('estimates:delete', (_event, id: string) => {
    return estimateService.delete(id)
  })

  createIpcHandler('estimates:convert-to-sale', (_event, id: string) => {
    return estimateService.convertToSale(id)
  })
}
