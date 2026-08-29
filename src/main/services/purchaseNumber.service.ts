import { documentSequenceService } from './documentSequence.service'

export const purchaseNumberService = {
  getNextPurchaseNo() {
    return documentSequenceService.getNextNumber('PURCHASE')
  }
}
