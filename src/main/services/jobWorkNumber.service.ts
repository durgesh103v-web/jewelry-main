import { documentSequenceService } from './documentSequence.service'

export const jobWorkNumberService = {
  getNextJobWorkNo() {
    return documentSequenceService.getNextNumber('JOB_WORK')
  }
}
