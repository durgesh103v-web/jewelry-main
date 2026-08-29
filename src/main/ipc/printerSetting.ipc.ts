import { createIpcHandler } from './wrapper'
import { printerSettingService } from '../services/printerSetting.service'

export function registerPrinterSettingIpc(): void {
  createIpcHandler('printer-setting:get', () => {
    return printerSettingService.get()
  })

  createIpcHandler('printer-setting:save', (_event, payload: any) => {
    return printerSettingService.save(payload)
  })
}
