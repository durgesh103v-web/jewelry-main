import { createIpcHandler } from './wrapper'
import { schemeService } from '../services/scheme.service'
import type {
  CreateSchemePayload,
  EnrollCustomerPayload,
  PayInstallmentPayload,
  RedeemSchemePayload,
  RefundSchemePayload
} from '../../shared/types/scheme'

export function registerSchemeIpc(): void {
  // Scheme Master
  createIpcHandler('scheme:create-scheme', (_event, payload: CreateSchemePayload) => {
    return schemeService.createScheme(payload)
  })

  createIpcHandler('scheme:get-scheme', (_event, id: string) => {
    return schemeService.getSchemeById(id)
  })

  createIpcHandler('scheme:list-schemes', (_event, filter?: any) => {
    return schemeService.listSchemes(filter)
  })

  // Customer Enrollment
  createIpcHandler('scheme:enroll-customer', (_event, payload: EnrollCustomerPayload) => {
    return schemeService.enrollCustomer(payload)
  })

  createIpcHandler('scheme:get-account', (_event, id: string) => {
    return schemeService.getAccountById(id)
  })

  createIpcHandler('scheme:list-accounts', (_event, filter?: any) => {
    return schemeService.listAccounts(filter)
  })

  createIpcHandler('scheme:get-installments', (_event, schemeAccountId: string) => {
    return schemeService.getInstallments(schemeAccountId)
  })

  // Installment Payment
  createIpcHandler('scheme:pay-installment', (_event, payload: PayInstallmentPayload) => {
    return schemeService.payInstallment(payload)
  })

  // Redemption
  createIpcHandler('scheme:redeem', (_event, payload: RedeemSchemePayload) => {
    return schemeService.redeemScheme(payload)
  })

  // Refund / Cancellation
  createIpcHandler('scheme:refund', (_event, payload: RefundSchemePayload) => {
    return schemeService.refundScheme(payload)
  })

  // Timeline & Dashboard
  createIpcHandler('scheme:get-timeline', (_event, schemeAccountId: string) => {
    return schemeService.getTimelineEvents(schemeAccountId)
  })

  createIpcHandler('scheme:get-dashboard', () => {
    return schemeService.getDashboardSummary()
  })
}
