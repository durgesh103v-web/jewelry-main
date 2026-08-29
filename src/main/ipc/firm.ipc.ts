import { createIpcHandler } from './wrapper'
import { firmService } from '../services/firm.service'

export function registerFirmIpc(): void {
  createIpcHandler('firm:get', () => {
    return firmService.get()
  })

  createIpcHandler('firm:save', (_event, payload: any) => {
    return firmService.save(payload)
  })
}
