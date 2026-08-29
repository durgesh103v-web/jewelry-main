import { documentSequenceService } from './documentSequence.service'

export const saleNumberService = {
  getNextSaleNo() {
    return documentSequenceService.getNextNumber('SALE')
  }
}
