import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { StockTakeRepository } from '../database/repositories/StockTakeRepository'
import { itemScanService } from './itemScan.service'
import { NotFoundError, ValidationError } from '../ipc/errors'
import type {
  StockTakeSessionRecord,
  StockTakeScanRecord,
  StockTakeSummary
} from '../../shared/types/tagging'

const stockTakeRepo = new StockTakeRepository()

export const stockTakeService = {
  /**
   * Start a new Stock Take verification session
   */
  startSession(location: string = 'MAIN_STORE', createdBy: string = 'Admin'): StockTakeSessionRecord {
    const active = stockTakeRepo.getActiveSession()
    if (active) {
      return active
    }

    const id = uuidv4()
    const sessionNumber = `STK-TAKE-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    return stockTakeRepo.createSession(id, sessionNumber, location, createdBy, now)
  },

  /**
   * Get active session
   */
  getActiveSession(): StockTakeSessionRecord | null {
    return stockTakeRepo.getActiveSession()
  },

  /**
   * List all sessions
   */
  listSessions(): StockTakeSessionRecord[] {
    return stockTakeRepo.listSessions()
  },

  /**
   * Scan an item during an active stock take session
   */
  scanItem(
    sessionId: string,
    identifier: string,
    operator: string = 'Operator'
  ): { scanRecord: StockTakeScanRecord; summary: StockTakeSummary } {
    const session = stockTakeRepo.getSessionById(sessionId)
    if (!session) {
      throw new NotFoundError(`Stock take session with ID ${sessionId} not found`)
    }
    if (session.status !== 'IN_PROGRESS') {
      throw new ValidationError(`Stock take session ${session.sessionNumber} is already completed`)
    }

    const scanRes = itemScanService.resolveIdentifier(identifier, 'STOCK_TAKE')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const scanId = uuidv4()

    let scanResult: 'MATCHED' | 'MISSING' | 'UNEXPECTED' | 'WRONG_LOCATION' | 'WRONG_STATUS' = 'UNEXPECTED'
    let stockItemId: string | null = null

    if (scanRes.success && scanRes.stockItem) {
      stockItemId = scanRes.stockItem.id
      if (scanRes.stockItem.location !== session.location) {
        scanResult = 'WRONG_LOCATION'
      } else if (scanRes.stockItem.status !== 'IN_STOCK') {
        scanResult = 'WRONG_STATUS'
      } else {
        scanResult = 'MATCHED'
      }
    }

    const scanRecord = stockTakeRepo.recordScan(
      scanId,
      sessionId,
      stockItemId,
      scanRes.identifierType,
      identifier,
      scanResult,
      operator,
      now
    )

    const summary = stockTakeRepo.getSessionSummary(sessionId)
    return { scanRecord, summary }
  },

  /**
   * Complete stock take session
   */
  completeSession(sessionId: string, notes: string = ''): StockTakeSummary {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    stockTakeRepo.completeSession(sessionId, notes, now)
    return stockTakeRepo.getSessionSummary(sessionId)
  },

  /**
   * Get full summary of a stock take session
   */
  getSessionSummary(sessionId: string): StockTakeSummary {
    const session = stockTakeRepo.getSessionById(sessionId)
    if (!session) {
      throw new NotFoundError(`Session not found`)
    }
    return stockTakeRepo.getSessionSummary(sessionId)
  }
}
