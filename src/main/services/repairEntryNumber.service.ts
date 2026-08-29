import { documentSequenceService } from './documentSequence.service'

export const repairEntryNumberService = {
  getNextRepairNo() {
    return documentSequenceService.getNextNumber('REPAIR')
  }
}
