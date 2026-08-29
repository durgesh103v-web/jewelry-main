import { createIpcHandler } from './wrapper'
import { itemScanService } from '../services/itemScan.service'
import { itemTagService } from '../services/itemTag.service'
import { stockTakeService } from '../services/stockTake.service'
import type { CreateStockItemPayload } from '../../shared/types/tagging'

export function registerTaggingIpc(): void {
  // Scan
  createIpcHandler(
    'tagging:resolve-identifier',
    (_event, payload: { identifier: string; operationType?: any }) => {
      return itemScanService.resolveIdentifier(payload.identifier, payload.operationType)
    }
  )

  // Physical Stock Items
  createIpcHandler('tagging:create-stock-item', (_event, payload: CreateStockItemPayload) => {
    return itemTagService.createStockItem(payload)
  })

  createIpcHandler('tagging:list-stock-items', (_event, filter?: any) => {
    return itemTagService.listStockItems(filter)
  })

  createIpcHandler('tagging:get-stock-item', (_event, id: string) => {
    return itemTagService.getStockItemById(id)
  })

  createIpcHandler('tagging:reprint-tag', (_event, stockItemId: string) => {
    return itemTagService.reprintTag(stockItemId)
  })

  createIpcHandler('tagging:replace-tag', (_event, payload: { stockItemId: string; reason: string }) => {
    return itemTagService.replaceTag(payload.stockItemId, payload.reason)
  })

  createIpcHandler('tagging:get-timeline', (_event, stockItemId: string) => {
    return itemTagService.getItemTimeline(stockItemId)
  })

  createIpcHandler('tagging:prepare-print-model', (_event, stockItemIds: string[]) => {
    return itemTagService.preparePrintModel(stockItemIds)
  })

  // Stock Take Sessions
  createIpcHandler('tagging:start-stock-take', (_event, payload?: { location?: string; createdBy?: string }) => {
    return stockTakeService.startSession(payload?.location, payload?.createdBy)
  })

  createIpcHandler('tagging:get-active-stock-take', () => {
    return stockTakeService.getActiveSession()
  })

  createIpcHandler('tagging:list-stock-takes', () => {
    return stockTakeService.listSessions()
  })

  createIpcHandler(
    'tagging:scan-stock-take-item',
    (_event, payload: { sessionId: string; identifier: string; operator?: string }) => {
      return stockTakeService.scanItem(payload.sessionId, payload.identifier, payload.operator)
    }
  )

  createIpcHandler(
    'tagging:complete-stock-take',
    (_event, payload: { sessionId: string; notes?: string }) => {
      return stockTakeService.completeSession(payload.sessionId, payload.notes || '')
    }
  )

  createIpcHandler('tagging:get-stock-take-summary', (_event, sessionId: string) => {
    return stockTakeService.getSessionSummary(sessionId)
  })
}
