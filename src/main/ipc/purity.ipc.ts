import { createIpcHandler } from './wrapper'
import { purityService } from '../services/purity.service'

export function registerPurityIpc(): void {
  createIpcHandler('purities:list', (_event, metalType?: string) => {
    return purityService.list(metalType)
  })

  createIpcHandler('purities:get-by-id', (_event, id: string) => {
    return purityService.getById(id)
  })
}
