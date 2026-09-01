import { createIpcHandler } from './wrapper'
import { manufacturingService } from '../services/manufacturing.service'
import type {
  CreateKarigarPayload,
  CreateManufacturingOrderPayload,
  MaterialIssuePayload,
  MaterialReturnPayload,
  FinishedReceiptPayload,
  KarigarSettlementPayload
} from '../../shared/types/manufacturing'

export function registerManufacturingIpc(): void {
  // Karigars
  createIpcHandler('manufacturing:create-karigar', (_event, payload: CreateKarigarPayload) => {
    return manufacturingService.createKarigar(payload)
  })

  createIpcHandler('manufacturing:list-karigars', (_event, filter?: any) => {
    return manufacturingService.listKarigars(filter)
  })

  createIpcHandler('manufacturing:get-karigar', (_event, id: string) => {
    return manufacturingService.getKarigarById(id)
  })

  createIpcHandler('manufacturing:get-metal-ledger', (_event, payload: { karigarId: string; metalType?: string }) => {
    return manufacturingService.getKarigarMetalLedger(payload.karigarId, payload.metalType)
  })

  // Manufacturing Orders
  createIpcHandler('manufacturing:create-order', (_event, payload: CreateManufacturingOrderPayload) => {
    return manufacturingService.createOrder(payload)
  })

  createIpcHandler('manufacturing:list-orders', (_event, filter?: any) => {
    return manufacturingService.listOrders(filter)
  })

  createIpcHandler('manufacturing:get-order', (_event, id: string) => {
    return manufacturingService.getOrderById(id)
  })

  // Material Issue
  createIpcHandler('manufacturing:issue-material', (_event, payload: MaterialIssuePayload) => {
    return manufacturingService.issueMaterial(payload)
  })

  // Material Return
  createIpcHandler('manufacturing:return-material', (_event, payload: MaterialReturnPayload) => {
    return manufacturingService.returnMaterial(payload)
  })

  // Finished Goods Receipt
  createIpcHandler('manufacturing:receive-finished-goods', (_event, payload: FinishedReceiptPayload) => {
    return manufacturingService.receiveFinishedGoods(payload)
  })

  // Karigar Settlement
  createIpcHandler('manufacturing:settle-karigar', (_event, payload: KarigarSettlementPayload) => {
    return manufacturingService.settleKarigar(payload)
  })

  // Reconciliation
  createIpcHandler('manufacturing:get-reconciliation', (_event, orderId: string) => {
    return manufacturingService.getOrderReconciliation(orderId)
  })
}
