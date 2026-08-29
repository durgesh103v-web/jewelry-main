import { JewelleryStockItemRepository } from '../database/repositories/JewelleryStockItemRepository'
import { ItemRepository } from '../database/repositories/ItemRepository'
import type { ScanResult, ScanIdentifierType } from '../../shared/types/tagging'

const stockItemRepo = new JewelleryStockItemRepository()
const itemRepo = new ItemRepository()

export const itemScanService = {
  /**
   * Universal Item Resolution across Barcode, QR, RFID, Stock Code, or Item Code
   */
  resolveIdentifier(
    identifier: string,
    operationType: 'SALE' | 'PURCHASE' | 'RETURN' | 'STOCK_TAKE' | 'GENERAL' = 'GENERAL'
  ): ScanResult {
    const trimmed = (identifier || '').trim()
    if (!trimmed) {
      return {
        success: false,
        identifierType: 'BARCODE',
        identifierValue: '',
        stockItem: null,
        isEligibleForOperation: false,
        operationStatus: 'INVALID_INPUT',
        message: 'Identifier cannot be empty'
      }
    }

    // Determine likely identifier type
    let identifierType: ScanIdentifierType = 'BARCODE'
    if (trimmed.startsWith('QR-') || trimmed.includes('|') || trimmed.startsWith('HTTP')) {
      identifierType = 'QR'
    } else if (trimmed.startsWith('E200') || (trimmed.length >= 24 && /^[0-9A-Fa-f]+$/.test(trimmed))) {
      identifierType = 'RFID'
    } else if (trimmed.startsWith('STK-')) {
      identifierType = 'STOCK_CODE'
    }

    // 1. Look up in serialized physical stock items
    let stockItem = stockItemRepo.findByIdentifier(trimmed)

    // 2. If not found in physical stock items, check master items table as fallback
    if (!stockItem) {
      const masterItem = itemRepo.findByBarcode(trimmed) || itemRepo.findById(trimmed)
      if (masterItem) {
        // Construct a virtual stock item representation from product master
        stockItem = {
          id: masterItem.id,
          stockItemCode: `PRD-${masterItem.id.slice(0, 8)}`,
          itemId: masterItem.id,
          itemName: masterItem.item_name,
          itemCode: null,
          metalType: masterItem.metal_type || 'GOLD',
          categoryName: masterItem.group_name,
          stampName: masterItem.stamp_name,
          designName: masterItem.design_name,
          barcode: masterItem.barcode_value,
          qrCode: null,
          rfidEpc: null,
          serialNumber: null,
          grossWeight: 0,
          netWeight: 0,
          fineWeight: 0,
          purityName: null,
          tunch: Number(masterItem.default_tanch || 100),
          status: 'IN_STOCK',
          location: 'MAIN_STORE',
          counter: '',
          tray: '',
          tagStatus: 'ACTIVE',
          lastScannedAt: new Date().toISOString(),
          createdAt: masterItem.created_at,
          updatedAt: masterItem.updated_at
        }
      }
    }

    if (!stockItem) {
      return {
        success: false,
        identifierType,
        identifierValue: trimmed,
        stockItem: null,
        isEligibleForOperation: false,
        operationStatus: 'NOT_FOUND',
        message: `No jewellery item found matching identifier "${trimmed}"`
      }
    }

    // Record scan timestamp
    stockItemRepo.recordScanTime(stockItem.id, new Date().toISOString())

    // Validate eligibility for the target operation
    let isEligible = true
    let operationStatus = 'OK'
    let message = `Found ${stockItem.itemName} (${stockItem.stockItemCode})`

    if (operationType === 'SALE') {
      if (stockItem.status === 'SOLD') {
        isEligible = false
        operationStatus = 'ALREADY_SOLD'
        message = `Item ${stockItem.stockItemCode} has already been sold.`
      } else if (stockItem.status === 'RESERVED') {
        isEligible = false
        operationStatus = 'RESERVED'
        message = `Item ${stockItem.stockItemCode} is reserved for another customer order.`
      } else if (stockItem.status === 'LOST' || stockItem.status === 'DAMAGED') {
        isEligible = false
        operationStatus = 'DAMAGED_OR_LOST'
        message = `Item ${stockItem.stockItemCode} is marked as ${stockItem.status}.`
      }
    } else if (operationType === 'RETURN') {
      if (stockItem.status === 'IN_STOCK') {
        isEligible = false
        operationStatus = 'ALREADY_IN_STOCK'
        message = `Item ${stockItem.stockItemCode} is already in stock. Cannot be returned unless sold.`
      }
    }

    return {
      success: true,
      identifierType,
      identifierValue: trimmed,
      stockItem,
      isEligibleForOperation: isEligible,
      operationStatus,
      message
    }
  }
}
