import { createIpcHandler } from './wrapper'
import { repairService } from '../services/repair.service'
import type {
  CreateRepairJobPayload,
  AssignKarigarPayload,
  RepairMaterialIssuePayload,
  ReceiveFromKarigarPayload,
  DeliverRepairPayload
} from '../../shared/types/repair'

export function registerRepairIpc(): void {
  // Repair Jobs
  createIpcHandler('repair:create-job', (_event, payload: CreateRepairJobPayload) => {
    return repairService.createRepairJob(payload)
  })

  createIpcHandler('repair:get-job', (_event, id: string) => {
    return repairService.getRepairJobById(id)
  })

  createIpcHandler('repair:list-jobs', (_event, filter?: any) => {
    return repairService.listRepairJobs(filter)
  })

  createIpcHandler('repair:assign-karigar', (_event, payload: AssignKarigarPayload) => {
    return repairService.assignKarigar(payload)
  })

  createIpcHandler('repair:issue-material', (_event, payload: RepairMaterialIssuePayload) => {
    return repairService.issueMaterial(payload)
  })

  createIpcHandler('repair:receive-from-karigar', (_event, payload: ReceiveFromKarigarPayload) => {
    return repairService.receiveFromKarigar(payload)
  })

  createIpcHandler(
    'repair:update-qc',
    (_event, payload: { repairJobId: string; qcStatus: 'APPROVED' | 'REJECTED'; notes?: string }) => {
      return repairService.updateQcStatus(payload.repairJobId, payload.qcStatus, payload.notes || '')
    }
  )

  createIpcHandler('repair:deliver', (_event, payload: DeliverRepairPayload) => {
    return repairService.deliverRepair(payload)
  })

  createIpcHandler('repair:cancel', (_event, payload: { repairJobId: string; reason?: string }) => {
    return repairService.cancelRepair(payload.repairJobId, payload.reason || '')
  })

  createIpcHandler('repair:get-timeline', (_event, repairJobId: string) => {
    return repairService.getTimelineEvents(repairJobId)
  })

  createIpcHandler('repair:get-dashboard', () => {
    return repairService.getDashboardSummary()
  })
}
