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

  console.log(`[SEED-CASH-VOUCHERS] Seeding Cash Vouchers into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Get Accounts
    const accounts = db
      .prepare(`SELECT id, account_name FROM accounts WHERE deleted_at IS NULL LIMIT 10`)
      .all() as { id: string; account_name: string }[]

    if (accounts.length === 0) {
      console.log(`[SEED-CASH-VOUCHERS] No accounts found, skipping`)
      continue
    }

    const acc1 = accounts[0].id
    const acc2 = accounts[1] ? accounts[1].id : accounts[0].id
    const acc3 = accounts[2] ? accounts[2].id : accounts[0].id

    // 2. Vouchers to Seed
    const vouchersToSeed = [
      {
        id: uuidv4(),
        type: 'RECEIPT' as const,
        no: 'CR-0001',
        date: threeDaysAgo,
        accountId: acc1,
        amount: 25000,
        narration: 'Cash received as advance for gold bridal set order'
      },
      {
        id: uuidv4(),
        type: 'PAYMENT' as const,
        no: 'CP-0001',
        date: twoDaysAgo,
        accountId: acc2,
        amount: 8500,
        narration: 'Karigar labour payment for casting and stone setting'
      },
      {
        id: uuidv4(),
        type: 'RECEIPT' as const,
        no: 'CR-0002',
        date: yesterday,
        accountId: acc3,
        amount: 42000,
        narration: 'Final bill payment for diamond necklace purchase'
      },
      {
        id: uuidv4(),
        type: 'PAYMENT' as const,
        no: 'CP-0002',
        date: today,
        accountId: acc1,
        amount: 5000,
        narration: 'Part settlement for old gold purchase'
      },
      {
        id: uuidv4(),
        type: 'RECEIPT' as const,
        no: 'CR-0003',
        date: today,
        accountId: acc2,
        amount: 15000,
        narration: 'Counter cash payment received towards silver bill'
      }
    ]

    for (const v of vouchersToSeed) {
      db.prepare(`
        INSERT OR REPLACE INTO cash_vouchers (
          id, voucher_type, voucher_no, voucher_date, account_id, amount, narration, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(v.id, v.type, v.no, v.date, v.accountId, v.amount, v.narration, now, now)
    }

    console.log(`[SEED-CASH-VOUCHERS] Successfully seeded ${vouchersToSeed.length} cash vouchers!`)
  } catch (err) {
    console.error(`[SEED-CASH-VOUCHERS] Error seeding into ${dbPath}:`, err)
  }
}
