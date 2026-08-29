import { createIpcHandler } from './wrapper'
import { returnTransactionService } from '../services/returnTransaction.service'
import type {
  CreateReturnPayload,
  ReturnFilter,
  ReturnType
} from '../../shared/types/returnTransaction'

export function registerReturnTransactionIpc(): void {
  createIpcHandler('returns:list', (_event, filter?: ReturnFilter) => {
    return returnTransactionService.list(filter)
  })

  createIpcHandler('returns:get-by-id', (_event, id: string) => {
    return returnTransactionService.getById(id)
  })

  createIpcHandler('returns:get-by-number', (_event, returnNumber: string) => {
    return returnTransactionService.getByNumber(returnNumber)
  })

  createIpcHandler('returns:get-by-sales-invoice', (_event, salesInvoiceId: string) => {
    return returnTransactionService.getBySalesInvoice(salesInvoiceId)
  })

  createIpcHandler('returns:get-by-purchase-invoice', (_event, purchaseInvoiceId: string) => {
    return returnTransactionService.getByPurchaseInvoice(purchaseInvoiceId)
  })

  createIpcHandler(
    'returns:get-returnable-items',
    (_event, payload: { invoiceId: string; returnType: ReturnType }) => {
      return returnTransactionService.getReturnableItems(payload.invoiceId, payload.returnType)
    }
  )

  createIpcHandler('returns:create', (_event, payload: CreateReturnPayload) => {
    return returnTransactionService.create(payload)
  })

  createIpcHandler('returns:cancel', (_event, id: string) => {
    return returnTransactionService.cancel(id)
  })

  createIpcHandler('returns:delete', (_event, id: string) => {
    return returnTransactionService.delete(id)
  })
}
