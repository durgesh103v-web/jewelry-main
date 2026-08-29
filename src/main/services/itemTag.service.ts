import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { JewelleryStockItemRepository } from '../database/repositories/JewelleryStockItemRepository'
import { ItemRepository } from '../database/repositories/ItemRepository'
import { NotFoundError } from '../ipc/errors'
import type {
  JewelleryStockItemRecord,
  CreateStockItemPayload,
  TagPrintItem,
  ItemTimelineEvent
} from '../../shared/types/tagging'

const stockItemRepo = new JewelleryStockItemRepository()
const itemRepo = new ItemRepository()

export const itemTagService = {
  /**
   * Generate a unique Barcode string
   */
  generateBarcode(metalType: string = 'GOLD'): string {
    const prefix = metalType.toUpperCase() === 'SILVER' ? 'SLV' : 'JWL'
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000)
    return `${prefix}${randomSuffix}`
  },

  /**
   * Create a new serialized physical jewellery stock item
   */
  createStockItem(payload: CreateStockItemPayload): JewelleryStockItemRecord {
    const masterItem = itemRepo.findById(payload.itemId)
    if (!masterItem) {
      throw new NotFoundError(`Product item with ID ${payload.itemId} not found`)
    }

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const randomCode = Math.floor(10000 + Math.random() * 90000)
    const stockItemCode = `STK-${dayjs().format('YYYY')}-${randomCode}`

    const barcode = payload.barcode || this.generateBarcode(masterItem.metal_type)
    const qrCode = payload.qrCode || `QR-${stockItemCode}`

    return stockItemRepo.insert(
      id,
      stockItemCode,
      {
        ...payload,
        barcode,
        qrCode
      },
      now
    )
  },

  /**
   * List all serialized physical stock items
   */
  listStockItems(filter?: any): JewelleryStockItemRecord[] {
    return stockItemRepo.findAll(filter)
  },

  /**
   * Get physical stock item by ID
   */
  getStockItemById(id: string): JewelleryStockItemRecord {
    const item = stockItemRepo.findById(id)
    if (!item) {
      throw new NotFoundError(`Stock item with ID ${id} not found`)
    }
    return item
  },

  /**
   * Mark tag as reprinted without altering stock identity
   */
  reprintTag(stockItemId: string): JewelleryStockItemRecord {
    const item = this.getStockItemById(stockItemId)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    stockItemRepo.updateBarcode(stockItemId, item.barcode || this.generateBarcode(item.metalType), 'REPRINTED', now)
    stockItemRepo.logTagHistory(uuidv4(), stockItemId, 'TAG_REPRINTED', item.barcode || null, item.barcode || null, 'Tag reprinted by operator', now)
    return this.getStockItemById(stockItemId)
  },

  /**
   * Replace lost/damaged tag with a new barcode/RFID while preserving stock identity
   */
  replaceTag(stockItemId: string, reason: string): JewelleryStockItemRecord {
    const item = this.getStockItemById(stockItemId)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newBarcode = this.generateBarcode(item.metalType)
    stockItemRepo.updateBarcode(stockItemId, newBarcode, 'REPLACED', now)
    stockItemRepo.logTagHistory(uuidv4(), stockItemId, 'TAG_REPLACED', item.barcode || null, newBarcode, reason, now)
    return this.getStockItemById(stockItemId)
  },

  /**
   * Get physical item lifecycle timeline
   */
  getItemTimeline(stockItemId: string): ItemTimelineEvent[] {
    return stockItemRepo.getItemTimeline(stockItemId)
  },

  /**
   * Prepare printable tag models for single or batch printing
   */
  preparePrintModel(stockItemIds: string[]): TagPrintItem[] {
    const items: TagPrintItem[] = []
    for (const id of stockItemIds) {
      const stockItem = stockItemRepo.findById(id)
      if (stockItem && stockItem.barcode) {
        items.push({
          stockItemId: stockItem.id,
          stockItemCode: stockItem.stockItemCode,
          itemName: stockItem.itemName,
          barcode: stockItem.barcode,
          qrCode: stockItem.qrCode,
          metalType: stockItem.metalType,
          purityName: stockItem.purityName || '22K',
          grossWeight: stockItem.grossWeight,
          netWeight: stockItem.netWeight,
          copies: 1
        })
      }
    }
    return items
  }
}
