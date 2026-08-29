import { createIpcHandler } from './wrapper'
import { weightScanService } from '../services/weightScan.service'

export function registerWeightScanIpc(): void {
  createIpcHandler('weight-scans:create', (_event, payload: any) => {
    return weightScanService.create(payload)
  })

  createIpcHandler('weight-scans:list', () => {
    return weightScanService.list()
  })

  createIpcHandler('weight-scans:get-by-id', (_event, id: string) => {
    return weightScanService.getById(id)
  })

  createIpcHandler('weight-scans:delete', (_event, id: string) => {
    return weightScanService.delete(id)
  })
}
