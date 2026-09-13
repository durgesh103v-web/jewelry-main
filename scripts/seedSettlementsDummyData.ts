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

  console.log(`[SEED-SETTLEMENTS] Seeding Settlements into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const fourDaysAgo = new Date(Date.now() - 345600000).toISOString().slice(0, 10)
    const fiveDaysAgo = new Date(Date.now() - 432000000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Get Accounts
    const accounts = db
      .prepare(`SELECT id, account_name FROM accounts WHERE deleted_at IS NULL LIMIT 10`)
      .all() as { id: string; account_name: string }[]

    if (accounts.length === 0) {
      console.log(`[SEED-SETTLEMENTS] No accounts found, skipping`)
      continue
    }

    const acc1 = accounts[0].id
    const acc2 = accounts[1] ? accounts[1].id : accounts[0].id
    const acc3 = accounts[2] ? accounts[2].id : accounts[0].id
    const acc4 = accounts[3] ? accounts[3].id : (accounts[1]?.id || accounts[0].id)

    const settlementsToSeed = [
      {
        id: uuidv4(),
        settlementNo: 'ST-0001',
        settlementDate: fiveDaysAgo,
        accountId: acc1,
        metalType: 'Gold',
        goldFine: 12.45,
        silverFine: 0,
        cash: 5000,
        bank: 0,
        anamat: 0,
        narration: 'Settlement against scrap gold fine conversion & cash rounding adjustment'
      },
      {
        id: uuidv4(),
        settlementNo: 'ST-0002',
        settlementDate: fourDaysAgo,
        accountId: acc2,
        metalType: 'Silver',
        goldFine: 0,
        silverFine: 250.0,
        cash: 0,
        bank: 15000,
        anamat: 0,
        narration: 'Silver workshop labour adjustment & bank RTGS settlement'
      },
      {
        id: uuidv4(),
        settlementNo: 'ST-0003',
        settlementDate: threeDaysAgo,
        accountId: acc3,
        metalType: 'Gold',
        goldFine: 0,
        silverFine: 0,
        cash: 12500,
        bank: 0,
        anamat: 20000,
        narration: 'Customer advance anamat adjustment & full cash balance discount write-off'
      },
      {
        id: uuidv4(),
        settlementNo: 'ST-0004',
        settlementDate: twoDaysAgo,
        accountId: acc4,
        metalType: 'Gold',
        goldFine: 5.2,
        silverFine: 0,
        cash: 0,
        bank: 25000,
        anamat: 0,
        narration: 'Karigar casting wastage settlement with pure gold fine credit'
      },
      {
        id: uuidv4(),
        settlementNo: 'ST-0005',
        settlementDate: yesterday,
        accountId: acc1,
        metalType: 'Silver',
        goldFine: 0,
        silverFine: 150.75,
        cash: 3500,
        bank: 0,
        anamat: 0,
        narration: 'Silver ornaments balance rate-cut conversion agreement'
      },
      {
        id: uuidv4(),
        settlementNo: 'ST-0006',
        settlementDate: today,
        accountId: acc2,
        metalType: 'Gold',
        goldFine: 2.0,
        silverFine: 0,
        cash: 1000,
        bank: 0,
        anamat: 0,
        narration: 'Annual ledger closing balance round-off settlement'
      }
    ]

    const insertSettlement = db.prepare(`
      INSERT OR REPLACE INTO settlements (
        id, settlement_no, settlement_date, account_id, metal_type,
        gold_fine, silver_fine, cash, bank, anamat,
        narration, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `)

    for (const s of settlementsToSeed) {
      insertSettlement.run(
        s.id,
        s.settlementNo,
        s.settlementDate,
        s.accountId,
        s.metalType,
        s.goldFine,
        s.silverFine,
        s.cash,
        s.bank,
        s.anamat,
        s.narration,
        now,
        now
      )
    }

    console.log(`[SEED-SETTLEMENTS] Successfully inserted ${settlementsToSeed.length} settlements`)
  } catch (err) {
    console.error(`[SEED-SETTLEMENTS] Error:`, err)
  } finally {
    db.close()
  }
}
