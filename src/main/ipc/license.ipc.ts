import { ipcMain } from 'electron'
import { licenseService } from '../services/licensing/license.service'
import type { LicenseFeature } from '../services/licensing/license.types'

export function registerLicenseIpc(): void {
  ipcMain.handle('license:get-status', () => {
    return licenseService.getLicenseStatus()
  })

  ipcMain.handle('license:activate', (_event, payload: { productKey: string }) => {
    return licenseService.activateLicense(payload?.productKey || '')
  })

  ipcMain.handle('license:get-info', () => {
    return licenseService.getLicenseInfo()
  })

  ipcMain.handle('license:is-feature-licensed', (_event, payload: { feature: LicenseFeature }) => {
    return licenseService.isFeatureLicensed(payload?.feature)
  })

  ipcMain.handle('license:get-machine-id', () => {
    return licenseService.getMachineId()
  })

  ipcMain.handle('license:deactivate', () => {
    return licenseService.deactivateLicense()
  })
}
