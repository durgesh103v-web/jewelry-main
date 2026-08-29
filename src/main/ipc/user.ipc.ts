import { createIpcHandler } from './wrapper'
import { userService } from '../services/user.service'

export function registerUserIpc(): void {
  createIpcHandler('users:list', () => {
    return userService.list()
  })

  createIpcHandler('users:create', (_event, payload: any) => {
    return userService.create(payload)
  })

  createIpcHandler('users:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return userService.update(payload.id, payload.payload)
    }
    return userService.update(id, payload)
  })

  createIpcHandler('users:delete', (_event, id: string) => {
    return userService.delete(id)
  })
}
