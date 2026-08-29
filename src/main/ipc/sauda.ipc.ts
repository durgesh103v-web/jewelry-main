import { createIpcHandler } from './wrapper'
import { saudaService } from '../services/sauda.service'

export function registerSaudaIpc(): void {
  createIpcHandler('sauda:next-number', () => {
    return saudaService.getNextNumber()
  })

  createIpcHandler('sauda:create', (_event, payload: any) => {
    return saudaService.create(payload)
  })

  createIpcHandler('sauda:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return saudaService.update(payload.id, payload.payload)
    }
    return saudaService.update(id, payload)
  })

  createIpcHandler('sauda:list', () => {
    return saudaService.list()
  })

  createIpcHandler('sauda:get-by-id', (_event, id: string) => {
    return saudaService.getById(id)
  })

  createIpcHandler('sauda:close', (_event, id: string) => {
    return saudaService.closeSauda(id)
  })

  createIpcHandler('sauda:delete', (_event, id: string) => {
    return saudaService.delete(id)
  })
}
