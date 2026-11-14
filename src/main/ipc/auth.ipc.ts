import { ipcMain } from 'electron'
import { authService } from '../services/auth.service'

export function registerAuthIpc(): void {
  ipcMain.handle('auth:get-state', () => {
    return authService.getState()
  })

  ipcMain.handle('auth:register', (_event, payload) => {
    return authService.register(payload)
  })

  ipcMain.handle('auth:login', (_event, payload) => {
    return authService.login(payload)
  })

  ipcMain.handle('auth:logout', () => {
    return authService.logout()
  })

  ipcMain.handle('auth:change-password', (_event, payload) => {
    return authService.changePassword(payload)
  })

  ipcMain.handle('auth:reset-password', (_event, payload) => {
    return authService.resetPassword(payload)
  })

  ipcMain.handle('auth:provision-owner', (_event, payload) => {
    return authService.provisionOwner(payload)
  })

  ipcMain.handle('auth:check-sync', () => {
    return authService.checkSync()
  })
}

