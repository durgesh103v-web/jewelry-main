import { createIpcHandler } from './wrapper'
import { pricingService } from '../services/pricing.service'

export function registerPricingIpc(): void {
  createIpcHandler('pricing:calculate', (_event, request: any) => {
    return pricingService.calculate(request)
  })
}
