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

  console.log(`[SEED-ORDER-PAYAL] Seeding Order Payal entries into: ${dbPath}`)
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
    const nextTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    const nextMonth = new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Get Accounts
    const accounts = db
      .prepare(`SELECT id, account_name FROM accounts WHERE deleted_at IS NULL LIMIT 10`)
      .all() as { id: string; account_name: string }[]

    // 2. Get Items
    const items = db
      .prepare(`SELECT id, item_name, metal_type FROM items WHERE deleted_at IS NULL LIMIT 10`)
      .all() as { id: string; item_name: string; metal_type?: string }[]

    if (accounts.length === 0 || items.length === 0) {
      console.log(`[SEED-ORDER-PAYAL] Need at least 1 account and 1 item, skipping`)
      continue
    }

    const acc1 = accounts[0].id
    const acc2 = accounts[1] ? accounts[1].id : accounts[0].id
    const acc3 = accounts[2] ? accounts[2].id : accounts[0].id
    const acc4 = accounts[3] ? accounts[3].id : (accounts[1]?.id || accounts[0].id)

    const item1 = items[0].id
    const item2 = items[1] ? items[1].id : items[0].id
    const item3 = items[2] ? items[2].id : items[0].id
    const item4 = items[3] ? items[3].id : (items[1]?.id || items[0].id)

    const ordersToSeed = [
      {
        id: uuidv4(),
        orderNo: 'OP-0001',
        orderDate: fiveDaysAgo,
        accountId: acc1,
        itemId: item1,
        pcs: 2,
        weight: 75.5,
        deliveryDate: yesterday,
        status: 'DELIVERED',
        narration: 'Silver Bombay Payal pair - Size 10.5 inch with handcrafted ghungroo bells (Delivered)'
      },
      {
        id: uuidv4(),
        orderNo: 'OP-0002',
        orderDate: fourDaysAgo,
        accountId: acc2,
        itemId: item2,
        pcs: 1,
        weight: 32.0,
        deliveryDate: nextWeek,
        status: 'PENDING',
        narration: 'Bridal designer Payal with antique rhodium polish and safety chain lock'
      },
      {
        id: uuidv4(),
        orderNo: 'OP-0003',
        orderDate: threeDaysAgo,
        accountId: acc3,
        itemId: item3,
        pcs: 4,
        weight: 120.0,
        deliveryDate: nextTwoWeeks,
        status: 'PENDING',
        narration: 'Fancy 92.5 Sterling Silver Payal set for wedding festive gifting'
      },
      {
        id: uuidv4(),
        orderNo: 'OP-0004',
        orderDate: twoDaysAgo,
        accountId: acc4,
        itemId: item4,
        pcs: 1,
        weight: 18.5,
        deliveryDate: nextMonth,
        status: 'PENDING',
        narration: 'Baby light-weight silver payal pair with bell drops and smooth edges'
      },
      {
        id: uuidv4(),
        orderNo: 'OP-0005',
        orderDate: yesterday,
        accountId: acc1,
        itemId: item2,
        pcs: 2,
        weight: 65.0,
        deliveryDate: nextTwoWeeks,
        status: 'PENDING',
        narration: 'Traditional Rajasthani heavy silver payal with engraved floral motifs'
      },
      {
        id: uuidv4(),
        orderNo: 'OP-0006',
        orderDate: today,
        accountId: acc2,
        itemId: item1,
        pcs: 1,
        weight: 45.0,
        deliveryDate: nextWeek,
        status: 'PENDING',
        narration: 'Customized order with customer gold advance adjustment, urgent delivery'
      }
    ]

    const insertOrder = db.prepare(`
      INSERT OR REPLACE INTO order_payal (
        id, order_no, order_date, account_id, item_id,
        pcs, weight, delivery_date, status, narration,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `)

    for (const o of ordersToSeed) {
      insertOrder.run(
        o.id,
        o.orderNo,
        o.orderDate,
        o.accountId,
        o.itemId,
        o.pcs,
        o.weight,
        o.deliveryDate,
        o.status,
        o.narration,
        now,
        now
      )
    }

    console.log(`[SEED-ORDER-PAYAL] Successfully inserted ${ordersToSeed.length} order entries`)
  } catch (err) {
    console.error(`[SEED-ORDER-PAYAL] Error:`, err)
  } finally {
    db.close()
  }
}
