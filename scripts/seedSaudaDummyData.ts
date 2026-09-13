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

  console.log(`[SEED-SAUDA] Seeding Sauda Book entries into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const fourDaysAgo = new Date(Date.now() - 345600000).toISOString().slice(0, 10)
    const fiveDaysAgo = new Date(Date.now() - 432000000).toISOString().slice(0, 10)
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const nextMonth = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Get Accounts
    const accounts = db
      .prepare(`SELECT id, account_name FROM accounts WHERE deleted_at IS NULL LIMIT 10`)
      .all() as { id: string; account_name: string }[]

    if (accounts.length === 0) {
      console.log(`[SEED-SAUDA] No accounts found, skipping`)
      continue
    }

    const acc1 = accounts[0].id
    const acc2 = accounts[1] ? accounts[1].id : accounts[0].id
    const acc3 = accounts[2] ? accounts[2].id : accounts[0].id
    const acc4 = accounts[3] ? accounts[3].id : (accounts[1]?.id || accounts[0].id)

    // 2. Deals to Seed
    const dealsToSeed = [
      {
        id: uuidv4(),
        saudaNo: 'SD-0001',
        saudaDate: fiveDaysAgo,
        accountId: acc1,
        metalType: 'Gold',
        transactionType: 'BUY',
        fine: 50.0,
        rate: 7250.0,
        amount: 362500.0,
        deliveryDate: yesterday,
        status: 'CLOSED',
        narration: 'Bullion rate lock contract - 50g 24K gold rate booked @ 7250/g (Settled via Pur-012)'
      },
      {
        id: uuidv4(),
        saudaNo: 'SD-0002',
        saudaDate: fourDaysAgo,
        accountId: acc2,
        metalType: 'Gold',
        transactionType: 'SELL',
        fine: 32.5,
        rate: 7320.0,
        amount: 237900.0,
        deliveryDate: nextWeek,
        status: 'OPEN',
        narration: 'Customer rate lock advance booking for bridal gold ornament set delivery'
      },
      {
        id: uuidv4(),
        saudaNo: 'SD-0003',
        saudaDate: threeDaysAgo,
        accountId: acc3,
        metalType: 'Silver',
        transactionType: 'BUY',
        fine: 500.0,
        rate: 92.5,
        amount: 46250.0,
        deliveryDate: nextWeek,
        status: 'OPEN',
        narration: 'Silver bar forward contract rate cut with bullion merchant'
      },
      {
        id: uuidv4(),
        saudaNo: 'SD-0004',
        saudaDate: twoDaysAgo,
        accountId: acc4,
        metalType: 'Gold',
        transactionType: 'BUY',
        fine: 100.0,
        rate: 7280.0,
        amount: 728000.0,
        deliveryDate: nextMonth,
        status: 'OPEN',
        narration: 'Refiner raw gold hedge purchase booking against festive order backlog'
      },
      {
        id: uuidv4(),
        saudaNo: 'SD-0005',
        saudaDate: yesterday,
        accountId: acc1,
        metalType: 'Silver',
        transactionType: 'SELL',
        fine: 1000.0,
        rate: 94.0,
        amount: 94000.0,
        deliveryDate: nextWeek,
        status: 'OPEN',
        narration: 'Silver utensils bulk rate lock deal for corporate festival gifting'
      },
      {
        id: uuidv4(),
        saudaNo: 'SD-0006',
        saudaDate: today,
        accountId: acc2,
        metalType: 'Gold',
        transactionType: 'BUY',
        fine: 25.0,
        rate: 7300.0,
        amount: 182500.0,
        deliveryDate: nextWeek,
        status: 'OPEN',
        narration: 'Daily morning bullion rate fix booking for workshop casting'
      }
    ]

    const insertSauda = db.prepare(`
      INSERT OR REPLACE INTO sauda_entries (
        id, sauda_no, sauda_date, account_id,
        metal_type, transaction_type, fine, rate, amount,
        delivery_date, status, narration, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `)

    for (const d of dealsToSeed) {
      insertSauda.run(
        d.id,
        d.saudaNo,
        d.saudaDate,
        d.accountId,
        d.metalType,
        d.transactionType,
        d.fine,
        d.rate,
        d.amount,
        d.deliveryDate,
        d.status,
        d.narration,
        now,
        now
      )
    }

    console.log(`[SEED-SAUDA] Successfully inserted ${dealsToSeed.length} sauda entries`)
  } catch (err) {
    console.error(`[SEED-SAUDA] Error:`, err)
  } finally {
    db.close()
  }
}
