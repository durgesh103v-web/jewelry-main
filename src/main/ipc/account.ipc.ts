import { createIpcHandler } from './wrapper'
import { accountService } from '../services/account.service'

export function registerAccountIpc(): void {
  createIpcHandler('accounts:list', () => {
    return accountService.list()
  })

  createIpcHandler('accounts:create', (_event, payload: any) => {
    return accountService.create(payload)
  })

  createIpcHandler('accounts:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return accountService.update(payload.id, payload.payload)
    }
    return accountService.update(payload?.id, payload)
  })

  createIpcHandler('accounts:delete', (_event, id: any) => {
    return accountService.delete(id)
  })
}
