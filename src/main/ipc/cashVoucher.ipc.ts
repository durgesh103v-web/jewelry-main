import { createIpcHandler } from './wrapper'
import { cashVoucherService } from '../services/cashVoucher.service'
import type { CashVoucherType } from '../../shared/types/cashVoucher'

export function registerCashVoucherIpc(): void {
  createIpcHandler('cash-vouchers:next-number', (_event, voucherType: CashVoucherType) => {
    return cashVoucherService.getNextVoucherNo(voucherType)
  })

  createIpcHandler('cash-vouchers:create', (_event, payload: any) => {
    return cashVoucherService.create(payload)
  })

  createIpcHandler('cash-vouchers:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return cashVoucherService.update(payload.id, payload.payload)
    }
    return cashVoucherService.update(id, payload)
  })

  createIpcHandler('cash-vouchers:delete', (_event, id: string) => {
    return cashVoucherService.delete(id)
  })

  createIpcHandler('cash-vouchers:get-by-id', (_event, id: string) => {
    return cashVoucherService.getById(id)
  })

  createIpcHandler('cash-vouchers:list', (_event, filter?: any) => {
    return cashVoucherService.list(filter)
  })

  createIpcHandler('cashVoucher:create', (_event, payload: any) => {
    return cashVoucherService.create(payload)
  })

  createIpcHandler('cashVoucher:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return cashVoucherService.update(payload.id, payload.payload)
    }
    return cashVoucherService.update(payload?.id, payload)
  })

  createIpcHandler('cashVoucher:delete', (_event, id: string) => {
    return cashVoucherService.delete(id)
  })

  createIpcHandler('cashVoucher:getById', (_event, id: string) => {
    return cashVoucherService.getById(id)
  })

  createIpcHandler('cashVoucher:list', (_event, filter?: any) => {
    return cashVoucherService.list(filter)
  })
}
