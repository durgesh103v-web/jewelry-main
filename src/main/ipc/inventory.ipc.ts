import { createIpcHandler } from './wrapper'
import { inventoryQueryService } from '../services/inventoryQuery.service'
import { inventoryMovementService, StockMovementParams } from '../services/inventoryMovement.service'

export function registerInventoryIpc(): void {
  createIpcHandler('inventory:findByBarcode', (_event, barcode: string) => {
    return inventoryQueryService.findItemByBarcode(barcode)
  })

  createIpcHandler('inventory:findBySku', (_event, sku: string) => {
    return inventoryQueryService.findItemBySku(sku)
  })

  createIpcHandler('inventory:getItemStock', (_event, itemId: string) => {
    return inventoryQueryService.getItemStock(itemId)
  })

  createIpcHandler('inventory:getMovementHistory', (_event, itemId: string) => {
    return inventoryQueryService.getItemMovementHistory(itemId)
  })

  createIpcHandler('inventory:getLocations', () => {
    return inventoryQueryService.getLocations()
  })

  createIpcHandler('inventory:postMovement', (_event, params: StockMovementParams) => {
    return inventoryMovementService.postMovement(params)
  })
}
