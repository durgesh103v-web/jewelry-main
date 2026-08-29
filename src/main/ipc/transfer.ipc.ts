import { createIpcHandler } from './wrapper'
import { transferService } from '../services/transfer.service'

export function registerTransferIpc(): void {
  createIpcHandler('transfers:next-number', () => {
    return transferService.getNextNumber()
  })

  createIpcHandler('transfers:create', (_event, payload: any) => {
    return transferService.create(payload)
  })

  createIpcHandler('transfers:list', () => {
    return transferService.list()
  })

  createIpcHandler('transfers:get-by-id', (_event, id: string) => {
    return transferService.getById(id)
  })

  createIpcHandler('transfers:delete', (_event, id: string) => {
    return transferService.delete(id)
  })
}
