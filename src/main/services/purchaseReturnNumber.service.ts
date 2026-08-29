import { documentSequenceService } from './documentSequence.service'

export const purchaseReturnNumberService = {
  getNextPurchaseReturnNo() {
    return documentSequenceService.getNextNumber('PURCHASE_RETURN')
  }
}
