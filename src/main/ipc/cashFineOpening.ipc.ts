import { createIpcHandler } from './wrapper'
import { cashFineOpeningService } from '../services/cashFineOpening.service'

export function registerCashFineOpeningIpc(): void {
  createIpcHandler('cash-fine-opening:get', () => {
    return cashFineOpeningService.get()
  })

  createIpcHandler('cash-fine-opening:save', (_event, payload: any) => {
    return cashFineOpeningService.save(payload)
  })
}
