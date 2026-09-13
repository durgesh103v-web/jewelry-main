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

  console.log(`[SEED-TRANSFERS] Seeding Transfers into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const fourDaysAgo = new Date(Date.now() - 345600000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Get Accounts
    const accounts = db
      .prepare(`SELECT id, account_name FROM accounts WHERE deleted_at IS NULL LIMIT 10`)
      .all() as { id: string; account_name: string }[]

    if (accounts.length < 2) {
      console.log(`[SEED-TRANSFERS] Need at least 2 accounts, skipping`)
      continue
    }

    const acc1 = accounts[0].id
    const acc2 = accounts[1].id
    const acc3 = accounts[2] ? accounts[2].id : accounts[0].id
    const acc4 = accounts[3] ? accounts[3].id : accounts[1].id

    // 2. Transfers to Seed
    const transfersToSeed = [
      {
        id: uuidv4(),
        transferNo: 'TR-0001',
        transferDate: fourDaysAgo,
        fromAccountId: acc1,
        toAccountId: acc2,
        metalType: 'Gold',
        goldFine: 15.5,
        silverFine: 0,
        cash: 0,
        bank: 0,
        anamat: 0,
        narration: 'Issue of fine gold bar to karigar for casting jewellery'
      },
      {
        id: uuidv4(),
        transferNo: 'TR-0002',
        transferDate: threeDaysAgo,
        fromAccountId: acc2,
        toAccountId: acc3,
        metalType: '',
        goldFine: 0,
        silverFine: 0,
        cash: 35000,
        bank: 0,
        anamat: 0,
        narration: 'Counter cash balance transferred to main store vault'
      },
      {
        id: uuidv4(),
        transferNo: 'TR-0003',
        transferDate: twoDaysAgo,
        fromAccountId: acc3,
        toAccountId: acc4,
        metalType: 'Silver',
        goldFine: 0,
        silverFine: 45.25,
        cash: 0,
        bank: 0,
        anamat: 0,
        narration: 'Silver granules transfer to silver jewellery workshop'
      },
      {
        id: uuidv4(),
        transferNo: 'TR-0004',
        transferDate: yesterday,
        fromAccountId: acc1,
        toAccountId: acc4,
        metalType: '',
        goldFine: 0,
        silverFine: 0,
        cash: 0,
        bank: 50000,
        anamat: 0,
        narration: 'Inter-account bank RTGS transfer for metal purchase'
      },
      {
        id: uuidv4(),
        transferNo: 'TR-0005',
        transferDate: today,
        fromAccountId: acc2,
        toAccountId: acc1,
        metalType: 'Gold',
        goldFine: 8.75,
        silverFine: 0,
        cash: 5000,
        bank: 0,
        anamat: 10000,
        narration: 'Settlement transfer with scrap gold fine and cash advance adjustment'
      }
    ]

    const insertTransfer = db.prepare(`
      INSERT OR REPLACE INTO transfers (
        id, transfer_no, transfer_date, from_account_id, to_account_id,
        metal_type, gold_fine, silver_fine, cash, bank, anamat,
        narration, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `)

    for (const t of transfersToSeed) {
      insertTransfer.run(
        t.id,
        t.transferNo,
        t.transferDate,
        t.fromAccountId,
        t.toAccountId,
        t.metalType,
        t.goldFine,
        t.silverFine,
        t.cash,
        t.bank,
        t.anamat,
        t.narration,
        now,
        now
      )
    }

    console.log(`[SEED-TRANSFERS] Successfully inserted ${transfersToSeed.length} transfers`)
  } catch (err) {
    console.error(`[SEED-TRANSFERS] Error:`, err)
  } finally {
    db.close()
  }
}
