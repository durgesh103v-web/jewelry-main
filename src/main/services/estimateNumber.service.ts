import { documentSequenceService } from './documentSequence.service'

export const estimateNumberService = {
  getNextEstimateNo() {
    return documentSequenceService.getNextNumber('ESTIMATE')
  }
}
