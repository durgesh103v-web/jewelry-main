import { documentSequenceService } from './documentSequence.service'

export const saleReturnNumberService = {
  getNextSaleReturnNo() {
    return documentSequenceService.getNextNumber('SALE_RETURN')
  }
}
