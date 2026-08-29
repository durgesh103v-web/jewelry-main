import { createIpcHandler } from './wrapper'
import { backupService } from '../services/backup.service'

export function registerBackupIpc(): void {
  createIpcHandler('backup:create', () => {
    return backupService.createBackup()
  })

  createIpcHandler('backup:get-last', () => {
    return backupService.getLastBackup()
  })

  createIpcHandler('backup:restore', () => {
    return backupService.restoreBackup()
  })
}
