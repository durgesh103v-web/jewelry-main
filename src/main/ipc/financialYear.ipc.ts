import { createIpcHandler } from './wrapper'
import { financialYearService } from '../services/financialYear.service'

export function registerFinancialYearIpc(): void {
  createIpcHandler('financial-years:list', () => {
    return financialYearService.list()
  })

  createIpcHandler('financial-years:get-current', () => {
    return financialYearService.getCurrent()
  })

  createIpcHandler('financial-years:create', (_event, payload: any) => {
    return financialYearService.create(payload)
  })

  createIpcHandler('financial-years:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return financialYearService.update(payload.id, payload.payload)
    }
    return financialYearService.update(id, payload)
  })

  createIpcHandler('financial-years:set-current', (_event, id: string) => {
    return financialYearService.setCurrent(id)
  })

  createIpcHandler('financial-years:toggle-closed', (_event, id: string, isClosed?: boolean) => {
    return financialYearService.toggleClosed(id, isClosed ?? false)
  })

  createIpcHandler('financial-years:delete', (_event, id: string) => {
    return financialYearService.delete(id)
  })
}
