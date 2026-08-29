import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { StockLedgerRepository } from '../database/repositories/StockLedgerRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { ValidationError } from '../ipc/errors'
import { InventoryMovementType } from '../../shared/constants/inventoryMovementTypes'

const stockLedgerRepository = new StockLedgerRepository()
const transactionRepository = new TransactionRepository()

export interface StockMovementParams {
  sourceType: string
  sourceId: string
  movementType?: InventoryMovementType | string
  locationId?: string | null
  entryDate?: string
  itemId: string
  stampId?: string | null
  designId?: string | null
  metalType: string
  pcsDelta: number
  grossWeightDelta: number
  netWeightDelta: number
  fineDelta: number
  narration?: string
}

export const inventoryMovementService = {
  postMovement(params: StockMovementParams): { id: string } {
    if (!params.itemId) {
      throw new ValidationError('Item ID is required for inventory movement')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const entryDate = params.entryDate || dayjs().format('YYYY-MM-DD')
    const id = uuidv4()

    transactionRepository.executeAtomic(() => {
      stockLedgerRepository.insert({
        id,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        movementType: params.movementType ?? params.sourceType,
        locationId: params.locationId ?? null,
        entryDate,
        itemId: params.itemId,
        stampId: params.stampId ?? null,
        designId: params.designId ?? null,
        metalType: params.metalType,
        pcsDelta: params.pcsDelta,
        grossWeightDelta: params.grossWeightDelta,
        netWeightDelta: params.netWeightDelta,
        fineDelta: params.fineDelta,
        narration: params.narration ?? '',
        createdAt: now
      })
    })

    return { id }
  },

  revertMovement(sourceType: string, sourceId: string): void {
    transactionRepository.executeAtomic(() => {
      stockLedgerRepository.deleteBySource(sourceType, sourceId)
    })
  }
}
