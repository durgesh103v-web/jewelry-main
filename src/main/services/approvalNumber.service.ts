import { documentSequenceService } from './documentSequence.service'

export const approvalNumberService = {
  getNextApprovalNo() {
    return documentSequenceService.getNextNumber('APPROVAL')
  }
}
