import { createIpcHandler } from './wrapper'
import { approvalService } from '../services/approval.service'

export function registerApprovalIpc(): void {
  createIpcHandler('approvals:next-number', () => {
    return approvalService.getNextApprovalNo()
  })

  createIpcHandler('approvals:create', (_event, payload: any) => {
    return approvalService.create(payload)
  })

  createIpcHandler('approvals:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return approvalService.update(payload.id, payload.payload)
    }
    return approvalService.update(id, payload)
  })

  createIpcHandler('approvals:list', () => {
    return approvalService.list()
  })

  createIpcHandler('approvals:get-by-id', (_event, id: string) => {
    return approvalService.getById(id)
  })

  createIpcHandler('approvals:delete', (_event, id: string) => {
    return approvalService.delete(id)
  })

  createIpcHandler('approvals:convert-to-sale', (_event, id: string) => {
    return approvalService.convertToSale(id)
  })

  createIpcHandler('approvals:return', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return approvalService.returnApproval(payload.id, payload.payload)
    }
    return approvalService.returnApproval(id, payload)
  })
}
