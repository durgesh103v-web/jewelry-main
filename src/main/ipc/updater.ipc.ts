import { createIpcHandler } from './wrapper'
import { updaterService, UpdaterState } from '../services/updater.service'

export function registerUpdaterIpc(): void {
  createIpcHandler('updater:get-current-version', (): string => {
    return updaterService.getCurrentVersion()
  })

  createIpcHandler('updater:get-state', (): UpdaterState => {
    return updaterService.getState()
  })

  createIpcHandler('updater:check-for-updates', async (): Promise<{ success: boolean; message?: string }> => {
    return updaterService.checkForUpdates(true)
  })

  createIpcHandler('updater:download-update', async (): Promise<{ success: boolean; message?: string }> => {
    return updaterService.downloadUpdate()
  })

  createIpcHandler('updater:install-update', async (): Promise<{ success: boolean; message?: string }> => {
    return updaterService.installUpdate()
  })

  createIpcHandler('updater:dismiss-update', (): void => {
    updaterService.dismissCurrentUpdate()
  })
}
