import { createIpcHandler } from './wrapper'
import { consignmentService } from '../services/consignment.service'
import type {
  CreateConsignmentInwardPayload,
  ReturnConsignmentItemsPayload,
  SettleConsignmentPayload
} from '../../shared/types/consignment'

export function registerConsignmentIpc(): void {
  // Consignment Inward
  createIpcHandler('consignment:create-inward', (_event, payload: CreateConsignmentInwardPayload) => {
    return consignmentService.createInward(payload)
  })

  createIpcHandler('consignment:get-inward', (_event, id: string) => {
    return consignmentService.getInwardById(id)
  })

  createIpcHandler('consignment:list-inwards', (_event, filter?: any) => {
    return consignmentService.listInwards(filter)
  })

  // Vendor Return
  createIpcHandler('consignment:return-items', (_event, payload: ReturnConsignmentItemsPayload) => {
    return consignmentService.returnToVendor(payload)
  })

  // Vendor Settlement
  createIpcHandler('consignment:settle', (_event, payload: SettleConsignmentPayload) => {
    return consignmentService.settleConsignment(payload)
  })

  createIpcHandler('consignment:get-settlements', (_event, payload?: any) => {
    return consignmentService.getSettlements(payload)
  })

  // Consignment Items List / Reporting
  createIpcHandler('consignment:list-items', (_event, filter?: any) => {
    return consignmentService.listItems(filter)
  })

  // Barcode / Scanner resolution
  createIpcHandler('consignment:get-by-barcode', (_event, barcode: string) => {
    return consignmentService.getActiveItemByBarcode(barcode)
  })

  // Dashboard
  createIpcHandler('consignment:get-dashboard', () => {
    return consignmentService.getDashboardSummary()
  })
}
