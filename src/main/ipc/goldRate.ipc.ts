import { createIpcHandler } from './wrapper'
import { goldRateService } from '../services/goldRate.service'

export function registerGoldRateIpc(): void {
  createIpcHandler('gold-rates:list', (_event, filter?: any) => {
    return goldRateService.list(filter)
  })

  createIpcHandler('gold-rates:get-current', (_event, payload?: any) => {
    if (payload && typeof payload === 'object') {
      return goldRateService.getCurrentRate(payload.metalType, payload.purityName)
    }
    return goldRateService.getCurrentRate(payload)
  })

  createIpcHandler('gold-rates:get-by-date', (_event, payload: any) => {
    if (payload && typeof payload === 'object') {
      return goldRateService.getRateAtDate(payload.metalType, payload.date, payload.purityName)
    }
    return null
  })

  createIpcHandler('gold-rates:get-by-id', (_event, id: string) => {
    return goldRateService.getById(id)
  })

  createIpcHandler('gold-rates:create', (_event, payload: any) => {
    return goldRateService.create(payload)
  })

  createIpcHandler('gold-rates:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return goldRateService.update(payload.id, payload.payload)
    }
    return goldRateService.update(id, payload)
  })

  createIpcHandler('gold-rates:delete', (_event, id: string) => {
    return goldRateService.delete(id)
  })
}
