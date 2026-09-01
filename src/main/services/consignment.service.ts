import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import {
  ConsignmentRepository,
  SupplierRepository,
  ItemRepository,
  JewelleryStockItemRepository,
  TransactionRepository,
  AccountLedgerRepository
} from '../database/repositories'
import { documentSequenceService } from './documentSequence.service'
import { itemTagService } from './itemTag.service'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'
import type {
  CreateConsignmentInwardPayload,
  ReturnConsignmentItemsPayload,
  SettleConsignmentPayload,
  ConsignmentInwardRecord,
  ConsignmentSettlementRecord,
  ConsignmentDashboardSummary,
  ConsignmentStatus,
  ConsignmentSettlementStatus
} from '../../shared/types/consignment'

const consignmentRepo = new ConsignmentRepository()
const supplierRepo = new SupplierRepository()
const itemRepo = new ItemRepository()
const stockItemRepo = new JewelleryStockItemRepository()
const transactionRepo = new TransactionRepository()
const accountLedgerRepo = new AccountLedgerRepository()

export const consignmentService = {
  /**
   * Create a new Vendor Consignment / Memo Inward record atomically with physical stock serialization and tagging.
   */
  createInward(payload: CreateConsignmentInwardPayload): { id: string; consignmentNumber: string } {
    if (!payload.supplierId) {
      throw new ValidationError('Supplier ID is required for consignment inward')
    }
    const supplier = supplierRepo.findById(payload.supplierId)
    if (!supplier) {
      throw new NotFoundError(`Supplier not found with ID: ${payload.supplierId}`)
    }

    if (!payload.items || payload.items.length === 0) {
      throw new ValidationError('At least one consignment item line is required')
    }

    const inwardDate = payload.inwardDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const inwardId = uuidv4()
    const consignmentNumber = documentSequenceService.getNextNumber('CONSIGNMENT_INWARD')

    let totalGrossWeight = 0
    let totalVendorCost = 0

    // Validate item lines
    const preparedItems: any[] = []
    for (let i = 0; i < payload.items.length; i++) {
      const line = payload.items[i]
      if (!line.itemId) {
        throw new ValidationError(`Item ID is required on line ${i + 1}`)
      }
      const item = itemRepo.findById(line.itemId)
      if (!item) {
        throw new NotFoundError(`Item not found for ID: ${line.itemId} on line ${i + 1}`)
      }

      const grossWeight = Number(line.grossWeight)
      const netWeight = Number(line.netWeight ?? line.grossWeight)
      const purityName = line.purityName || '22K'
      const tunch = Number(line.tunch ?? 91.6)
      const fineWeight = Number(line.fineWeight ?? Number(((netWeight * tunch) / 100).toFixed(3)))
      const vendorCost = Number(line.vendorCost ?? 0)
      const retailPrice = Number(line.retailPrice ?? 0)

      if (grossWeight <= 0) {
        throw new ValidationError(`Gross weight must be greater than 0 on line ${i + 1}`)
      }

      totalGrossWeight += grossWeight
      totalVendorCost += vendorCost

      const stockItemId = uuidv4()
      const stockItemCode = `STK-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}-${i + 1}`
      const barcode = itemTagService.generateBarcode(item.metal_type || 'Gold')

      preparedItems.push({
        consignmentItemId: uuidv4(),
        stockItemId,
        stockItemCode,
        barcode,
        item,
        itemId: line.itemId,
        vendorItemCode: line.vendorItemCode || '',
        grossWeight,
        netWeight,
        fineWeight,
        purityName,
        tunch,
        vendorCost,
        retailPrice,
        counter: line.counter || '',
        tray: line.tray || '',
        notes: line.notes || ''
      })
    }

    transactionRepo.executeAtomic(() => {
      // 1. Insert Consignment Inward Header
      consignmentRepo.insertInward(
        inwardId,
        consignmentNumber,
        payload.supplierId,
        inwardDate,
        payload.expectedReturnDate || null,
        preparedItems.length,
        Number(totalGrossWeight.toFixed(3)),
        Number(totalVendorCost.toFixed(2)),
        payload.notes || '',
        'Admin',
        now
      )

      // 2. Create Serialized Physical Stock Items
      for (const p of preparedItems) {
        stockItemRepo.insert(
          p.stockItemId,
          p.stockItemCode,
          {
            itemId: p.itemId,
            barcode: p.barcode,
            qrCode: `QR-${p.barcode}`,
            grossWeight: p.grossWeight,
            netWeight: p.netWeight,
            fineWeight: p.fineWeight,
            purityName: p.purityName,
            tunch: p.tunch,
            location: 'MAIN_STORE',
            counter: p.counter,
            tray: p.tray
          },
          now
        )

        stockItemRepo.updateStatus(p.stockItemId, 'CONSIGNMENT', now)

        // Log tag creation event in physical item history
        stockItemRepo.logTagHistory(
          uuidv4(),
          p.stockItemId,
          'TAG_CREATED',
          null,
          p.barcode,
          `Received on vendor consignment #${consignmentNumber} from ${supplier.name}. Vendor cost: ₹${p.vendorCost.toLocaleString()}`,
          now
        )
      }

      // 3. Insert Consignment Items Lines
      const itemsToInsert = preparedItems.map((p) => ({
        id: p.consignmentItemId,
        consignmentInwardId: inwardId,
        supplierId: payload.supplierId,
        stockItemId: p.stockItemId,
        itemId: p.itemId,
        vendorItemCode: p.vendorItemCode,
        grossWeight: p.grossWeight,
        netWeight: p.netWeight,
        fineWeight: p.fineWeight,
        purityName: p.purityName,
        tunch: p.tunch,
        vendorCost: p.vendorCost,
        retailPrice: p.retailPrice,
        notes: p.notes,
        now
      }))

      consignmentRepo.insertConsignmentItems(itemsToInsert)
    })

    return { id: inwardId, consignmentNumber }
  },

  /**
   * Return unsold consignment pieces back to the vendor.
   */
  returnToVendor(payload: ReturnConsignmentItemsPayload): { returnId: string; returnNumber: string } {
    if (!payload.consignmentInwardId) {
      throw new ValidationError('Consignment Inward ID is required')
    }
    const inward = consignmentRepo.getInwardById(payload.consignmentInwardId)
    if (!inward) {
      throw new NotFoundError(`Consignment Inward not found: ${payload.consignmentInwardId}`)
    }

    if (inward.status === 'CLOSED') {
      throw new ConflictError('Cannot return items from a closed consignment inward')
    }

    if (!payload.consignmentItemIds || payload.consignmentItemIds.length === 0) {
      throw new ValidationError('At least one item must be selected for vendor return')
    }

    const returnDate = payload.returnDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const returnId = uuidv4()
    const returnNumber = documentSequenceService.getNextNumber('CONSIGNMENT_RETURN')

    const itemsToReturn: any[] = []
    let totalReturnGrossWeight = 0

    for (const citemId of payload.consignmentItemIds) {
      const citem = consignmentRepo.getItemById(citemId)
      if (!citem) {
        throw new NotFoundError(`Consignment item not found: ${citemId}`)
      }
      if (citem.consignmentInwardId !== payload.consignmentInwardId) {
        throw new ValidationError(`Item ${citemId} does not belong to consignment ${inward.consignmentNumber}`)
      }
      if (citem.status === 'SOLD') {
        throw new ConflictError(`Item ${citem.barcode || citem.id} is already SOLD and cannot be returned directly to vendor`)
      }
      if (citem.status === 'RETURNED') {
        throw new ConflictError(`Item ${citem.barcode || citem.id} has already been returned to vendor`)
      }

      totalReturnGrossWeight += citem.grossWeight
      itemsToReturn.push({
        id: uuidv4(),
        consignmentReturnId: returnId,
        consignmentItemId: citem.id,
        stockItemId: citem.stockItemId,
        grossWeight: citem.grossWeight,
        barcode: citem.barcode,
        now
      })
    }

    transactionRepo.executeAtomic(() => {
      // 1. Create Consignment Return Header
      consignmentRepo.insertReturn(
        returnId,
        returnNumber,
        inward.id,
        inward.supplierId,
        returnDate,
        itemsToReturn.length,
        Number(totalReturnGrossWeight.toFixed(3)),
        payload.notes || '',
        now
      )

      // 2. Insert Return Lines and update Consignment Items status
      consignmentRepo.insertReturnItems(itemsToReturn)

      // 3. Update Physical Stock Items to RETURNED_TO_VENDOR
      for (const ret of itemsToReturn) {
        stockItemRepo.updateStatus(ret.stockItemId, 'RETURNED_TO_VENDOR', now)
        stockItemRepo.logTagHistory(
          uuidv4(),
          ret.stockItemId,
          'RETURNED_TO_VENDOR',
          ret.barcode || null,
          ret.barcode || null,
          `Returned to vendor on return #${returnNumber} (Inward #${inward.consignmentNumber})`,
          now
        )
      }

      // 4. Update Parent Inward Status
      this.refreshInwardStatus(inward.id, now)
    })

    return { returnId, returnNumber }
  },

  /**
   * Process a consignment item sale atomically when sold at POS.
   */
  processConsignmentSale(stockItemId: string, salesInvoiceId: string, invoiceNumber: string): boolean {
    const citem = consignmentRepo.getItemByStockItemId(stockItemId)
    if (!citem || citem.status !== 'IN_SHOWROOM') {
      return false
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    // 1. Mark Consignment Item as SOLD
    consignmentRepo.markItemSold(citem.id, salesInvoiceId, now)

    // 2. Update Physical Stock Item
    stockItemRepo.updateStatus(citem.stockItemId, 'SOLD', now)
    stockItemRepo.logTagHistory(
      uuidv4(),
      citem.stockItemId,
      'CONSIGNMENT_SOLD',
      citem.barcode || null,
      citem.barcode || null,
      `Sold on Sales Invoice #${invoiceNumber}. Vendor liability recognized: ₹${citem.vendorCost.toLocaleString()}`,
      now
    )

    // 3. Post Supplier Payable in Account Ledger
    if (citem.vendorCost > 0) {
      const supplier = supplierRepo.findById(citem.supplierId)
      if (supplier && supplier.accountId) {
        accountLedgerRepo.insert({
          id: uuidv4(),
          sourceType: 'CONSIGNMENT_SALE',
          sourceId: salesInvoiceId,
          entryDate: dayjs().format('YYYY-MM-DD'),
          accountId: supplier.accountId,
          metalType: null,
          cashJama: citem.vendorCost,
          cashNave: 0,
          bankJama: 0,
          bankNave: 0,
          narration: `Consignment Sale Recognition: Item #${citem.stockItemCode || citem.barcode} (Inv #${invoiceNumber})`,
          createdAt: now
        })
      }
    }

    // 4. Refresh Parent Inward Status
    this.refreshInwardStatus(citem.consignmentInwardId, now)

    return true
  },

  /**
   * Handle Customer Sales Return of a previously sold consignment item.
   * If unsettled with vendor, reverses supplier liability and restores showroom custody.
   * If already settled, transitions item to SHOP_OWNED inventory.
   */
  processCustomerReturn(stockItemId: string, returnId: string, returnNumber: string): boolean {
    const citem = consignmentRepo.getItemByStockItemId(stockItemId)
    if (!citem || citem.status !== 'SOLD') {
      return false
    }

    const inward = consignmentRepo.getInwardById(citem.consignmentInwardId)
    if (!inward) return false

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    // Check if parent inward has been fully settled with vendor
    const isSettledWithVendor = inward.settlementStatus === 'SETTLED'

    if (isSettledWithVendor) {
      // Business Decision: Vendor has already been paid, so the returned item now belongs to the shop
      stockItemRepo.updateStatus(stockItemId, 'IN_STOCK', now)
      stockItemRepo.logTagHistory(
        uuidv4(),
        stockItemId,
        'CUSTOMER_RETURN',
        citem.barcode || null,
        citem.barcode || null,
        `Customer Return #${returnNumber}. Item was previously settled with vendor; now added to shop inventory.`,
        now
      )
    } else {
      // Unsettled: Reverse recognized vendor liability and restore showroom custody
      if (citem.vendorCost > 0) {
        const supplier = supplierRepo.findById(citem.supplierId)
        if (supplier && supplier.accountId) {
          accountLedgerRepo.insert({
            id: uuidv4(),
            sourceType: 'CONSIGNMENT_SALE_REVERSAL',
            sourceId: returnId,
            entryDate: dayjs().format('YYYY-MM-DD'),
            accountId: supplier.accountId,
            metalType: null,
            cashJama: 0,
            cashNave: citem.vendorCost, // Debit / Nave reduces the supplier payable
            bankJama: 0,
            bankNave: 0,
            narration: `Consignment Sale Reversal: Customer Return #${returnNumber} for Item #${citem.stockItemCode || citem.barcode}`,
            createdAt: now
          })
        }
      }

      // Mark consignment item back to IN_SHOWROOM
      this.revertItemToInShowroom(citem.id, now)

      // Restore physical stock status to CONSIGNMENT
      stockItemRepo.updateStatus(stockItemId, 'CONSIGNMENT', now)
      stockItemRepo.logTagHistory(
        uuidv4(),
        stockItemId,
        'CUSTOMER_RETURN',
        citem.barcode || null,
        citem.barcode || null,
        `Customer Return #${returnNumber}. Reverted to vendor showroom consignment custody.`,
        now
      )

      this.refreshInwardStatus(citem.consignmentInwardId, now)
    }

    return true
  },

  /**
   * Settle vendor liability for sold consignment pieces.
   */
  settleConsignment(payload: SettleConsignmentPayload): { settlementId: string; settlementNumber: string } {
    if (!payload.consignmentInwardId) {
      throw new ValidationError('Consignment Inward ID is required')
    }

    const inward = consignmentRepo.getInwardById(payload.consignmentInwardId)
    if (!inward) {
      throw new NotFoundError(`Consignment Inward not found: ${payload.consignmentInwardId}`)
    }

    const outstanding = inward.outstandingLiability || 0
    if (outstanding <= 0) {
      throw new ConflictError(`No outstanding vendor liability to settle for consignment #${inward.consignmentNumber}`)
    }

    const settleAmount = Number(payload.amount)
    if (isNaN(settleAmount) || settleAmount <= 0) {
      throw new ValidationError('Settlement amount must be greater than 0')
    }

    if (settleAmount > outstanding) {
      throw new ValidationError(
        `Settlement amount (₹${settleAmount.toLocaleString()}) exceeds remaining outstanding liability of ₹${outstanding.toLocaleString()}`
      )
    }

    const supplier = supplierRepo.findById(inward.supplierId)
    if (!supplier) {
      throw new NotFoundError(`Supplier not found: ${inward.supplierId}`)
    }

    const settlementDate = payload.settlementDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const settlementId = uuidv4()
    const settlementNumber = documentSequenceService.getNextNumber('CONSIGNMENT_SETTLEMENT')

    const newTotalSettled = Number(((inward.totalSettledAmount || 0) + settleAmount).toFixed(2))
    const totalSoldCost = inward.totalSoldVendorCost || 0
    const newSettlementStatus: ConsignmentSettlementStatus =
      newTotalSettled >= totalSoldCost ? 'SETTLED' : 'PARTIALLY_SETTLED'

    const isBank = ['BANK', 'UPI', 'CARD', 'CHEQUE'].includes(payload.paymentMethod)

    transactionRepo.executeAtomic(() => {
      // 1. Insert Settlement Record
      consignmentRepo.insertSettlement(
        settlementId,
        settlementNumber,
        inward.supplierId,
        inward.id,
        settlementDate,
        settleAmount,
        payload.paymentMethod,
        payload.paymentReference || '',
        payload.notes || '',
        'Admin',
        now
      )

      // 2. Update Inward Settled Totals & Settlement Status
      consignmentRepo.updateInwardSettledAmount(inward.id, newTotalSettled, newSettlementStatus, now)

      // 3. Post Payment / Settlement in Account Ledger (Debit / Nave to Supplier reduces payable)
      if (supplier.accountId) {
        accountLedgerRepo.insert({
          id: uuidv4(),
          sourceType: 'CONSIGNMENT_SETTLEMENT',
          sourceId: settlementId,
          entryDate: settlementDate,
          accountId: supplier.accountId,
          metalType: null,
          cashJama: 0,
          cashNave: !isBank ? settleAmount : 0,
          bankJama: 0,
          bankNave: isBank ? settleAmount : 0,
          narration: `Vendor Settlement #${settlementNumber} for Consignment #${inward.consignmentNumber} (${payload.paymentMethod}${
            payload.paymentReference ? `: ${payload.paymentReference}` : ''
          })`,
          createdAt: now
        })
      }
    })

    return { settlementId, settlementNumber }
  },

  getSettlements(consignmentInwardId: string): ConsignmentSettlementRecord[] {
    return consignmentRepo.getSettlementsByInwardId(consignmentInwardId)
  },

  /**
   * Revert a sold item to showroom status when returned by customer before settlement.
   */
  revertItemToInShowroom(citemId: string, now: string): void {
    consignmentRepo.revertItemToInShowroom(citemId, now)
  },

  /**
   * Refresh and update consignment inward status based on item line states.
   */
  refreshInwardStatus(inwardId: string, now: string): void {
    const items = consignmentRepo.getItemsByInwardId(inwardId)
    if (items.length === 0) return

    const inShowroomCount = items.filter((i) => i.status === 'IN_SHOWROOM').length
    const soldCount = items.filter((i) => i.status === 'SOLD').length
    const returnedCount = items.filter((i) => i.status === 'RETURNED').length

    let newStatus: ConsignmentStatus = 'ACTIVE'
    if (inShowroomCount === 0) {
      if (soldCount > 0 && returnedCount > 0) {
        newStatus = 'COMPLETED'
      } else if (soldCount > 0) {
        newStatus = 'COMPLETED'
      } else {
        newStatus = 'CLOSED'
      }
    } else if (soldCount > 0 || returnedCount > 0) {
      newStatus = 'PARTIALLY_SETTLED'
    }

    consignmentRepo.updateInwardStatus(inwardId, newStatus, now)
  },

  getInwardById(id: string): ConsignmentInwardRecord | null {
    return consignmentRepo.getInwardById(id)
  },

  listInwards(filters?: { status?: string; supplierId?: string; search?: string }): ConsignmentInwardRecord[] {
    return consignmentRepo.listInwards(filters)
  },

  getActiveItemByBarcode(barcode: string) {
    return consignmentRepo.getActiveItemByBarcode(barcode)
  },

  getDashboardSummary(): ConsignmentDashboardSummary {
    return consignmentRepo.getDashboardSummary()
  }
}
