import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    continue
  }

  console.log(`[SEED-WEIGHT-SCAN] Seeding Weight Scans into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Get Items
    const items = db
      .prepare(`SELECT id, item_name, metal_type, fixed_weight_per_pcs FROM items WHERE deleted_at IS NULL LIMIT 10`)
      .all() as { id: string; item_name: string; metal_type: string; fixed_weight_per_pcs: number }[]

    const item1 = items[0]
    const item2 = items[1] || item1
    const item3 = items[2] || item1
    const item4 = items[3] || item2

    // 2. Weight Scan Logs to Seed
    const logsToSeed = [
      {
        id: uuidv4(),
        scanDate: threeDaysAgo,
        barcode: 'BC-GOLD-101',
        itemId: item1 ? item1.id : null,
        grossWeight: 14.85,
        netWeight: 14.2,
        fine: 13.064,
        narration: 'Showcase counter stock cross-verification'
      },
      {
        id: uuidv4(),
        scanDate: twoDaysAgo,
        barcode: 'BC-BRAC-202',
        itemId: item2 ? item2.id : null,
        grossWeight: 28.5,
        netWeight: 28.5,
        fine: 26.22,
        narration: 'Weighed upon receipt from karigar'
      },
      {
        id: uuidv4(),
        scanDate: yesterday,
        barcode: 'BC-RING-303',
        itemId: item3 ? item3.id : null,
        grossWeight: 5.62,
        netWeight: 5.15,
        fine: 4.738,
        narration: 'Diamond ring pre-delivery weight audit'
      },
      {
        id: uuidv4(),
        scanDate: yesterday,
        barcode: 'BC-SILV-404',
        itemId: item4 ? item4.id : null,
        grossWeight: 52.4,
        netWeight: 52.4,
        fine: 48.208,
        narration: 'Silver bowl counter audit'
      },
      {
        id: uuidv4(),
        scanDate: today,
        barcode: 'BC-NECK-505',
        itemId: item1 ? item1.id : null,
        grossWeight: 45.18,
        netWeight: 43.5,
        fine: 40.02,
        narration: 'Bridal necklace scale cross-check before customer trial'
      }
    ]

    const insertLog = db.prepare(`
      INSERT OR REPLACE INTO weight_scan_logs (
        id, scan_date, barcode, item_id, gross_weight, net_weight, fine, narration, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const log of logsToSeed) {
      insertLog.run(
        log.id,
        log.scanDate,
        log.barcode,
        log.itemId,
        log.grossWeight,
        log.netWeight,
        log.fine,
        log.narration,
        now
      )
    }

    console.log(`[SEED-WEIGHT-SCAN] Successfully inserted ${logsToSeed.length} weight scan logs`)
  } catch (err) {
    console.error(`[SEED-WEIGHT-SCAN] Error:`, err)
  } finally {
    db.close()
  }
}
