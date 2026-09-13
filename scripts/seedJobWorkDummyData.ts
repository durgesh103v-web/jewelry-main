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

  console.log(`[SEED-JOB-WORK] Seeding Job Work dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const fourDaysAgo = new Date(Date.now() - 345600000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Find or create Account Group
    let accGroup = db
      .prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL LIMIT 1`)
      .get() as any

    if (!accGroup) {
      accGroup = { id: 'grp-karigar-artisan' }
      db.prepare(`
        INSERT OR REPLACE INTO account_groups (id, group_name, group_type, description, active, created_at, updated_at)
        VALUES ('grp-karigar-artisan', 'Karigar & Artisans', 'Liabilities', 'Job work craftsmen and suppliers', 1, ?, ?)
      `).run(now, now)
    }

    // 2. Ensure Karigar Accounts exist
    const ensureAccount = (id: string, name: string, phone: string) => {
      const existing = db.prepare(`SELECT id FROM accounts WHERE id = ? OR account_name = ?`).get(id, name) as any
      if (existing) return existing.id
      db.prepare(`
        INSERT INTO accounts (id, account_name, account_group_id, mobile_number, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, accGroup.id, phone, now, now)
      return id
    }

    const karigar1 = ensureAccount('acc-karigar-ramesh', 'Ramesh Karigar (Goldsmith)', '9820112233')
    const karigar2 = ensureAccount('acc-karigar-babubhai', 'Babubhai Artisan (Silversmith)', '9820445566')
    const karigar3 = ensureAccount('acc-karigar-shankar', 'Shankar Arts (Casting & Polish)', '9819998877')

    // 3. Find or create Item Group
    let itemGroupGold = db.prepare(`SELECT id FROM item_groups WHERE metal_type = 'Gold' AND deleted_at IS NULL LIMIT 1`).get() as any
    if (!itemGroupGold) {
      itemGroupGold = { id: 'grp-item-gold' }
      db.prepare(`
        INSERT OR REPLACE INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
        VALUES ('grp-item-gold', 'Gold Jewellery', 'Gold', 'Gold items', 1, ?, ?)
      `).run(now, now)
    }

    let itemGroupSilver = db.prepare(`SELECT id FROM item_groups WHERE metal_type = 'Silver' AND deleted_at IS NULL LIMIT 1`).get() as any
    if (!itemGroupSilver) {
      itemGroupSilver = { id: 'grp-item-silver' }
      db.prepare(`
        INSERT OR REPLACE INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
        VALUES ('grp-item-silver', 'Silver Jewellery', 'Silver', 'Silver items', 1, ?, ?)
      `).run(now, now)
    }

    // 4. Ensure Items exist
    const ensureItem = (id: string, name: string, metal: string, groupId: string) => {
      const existing = db.prepare(`SELECT id FROM items WHERE id = ? OR item_name = ?`).get(id, name) as any
      if (existing) return existing.id
      db.prepare(`
        INSERT INTO items (id, item_name, metal_type, item_group_id, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, metal, groupId, now, now)
      return id
    }

    const goldNecklace = ensureItem('item-gold-necklace', 'Gold Bridal Necklace 22K', 'Gold', itemGroupGold.id)
    const goldBangles = ensureItem('item-gold-bangles', 'Gold Kada / Bangles', 'Gold', itemGroupGold.id)
    const silverPayal = ensureItem('item-silver-payal', 'Silver Bombay Payal (Pair)', 'Silver', itemGroupSilver.id)
    const silverKada = ensureItem('item-silver-kada', 'Silver Gents Kada', 'Silver', itemGroupSilver.id)

    // 5. Seed Job Work Orders
    const ordersToSeed = [
      {
        id: 'jw-order-001',
        orderNo: 'JW-0001',
        orderDate: fourDaysAgo,
        karigarId: karigar2,
        metal: 'Silver',
        itemId: silverPayal,
        grossWt: 250.0,
        netWt: 250.0,
        narration: 'Silver 92.5 chandi payal 2 pairs. Expected delivery in 3 days.',
        status: 'received',
        receipts: [
          {
            id: uuidv4(),
            receiptDate: twoDaysAgo,
            pcs: 2,
            grossWt: 248.5,
            netWt: 248.5,
            tunch: 92.5,
            wastage: 1.5,
            hishob: 94.0,
            fine: 233.59,
            weightLoss: 1.5,
            labourRate: 450,
            labourRateType: 'Pcs',
            majuri: 900,
            narration: 'Both pairs finished with meena work and bells.'
          }
        ]
      },
      {
        id: 'jw-order-002',
        orderNo: 'JW-0002',
        orderDate: threeDaysAgo,
        karigarId: karigar1,
        metal: 'Gold',
        itemId: goldNecklace,
        grossWt: 45.25,
        netWt: 45.25,
        narration: '22k casting necklace design #ND-104 with kundan setting.',
        status: 'partial_received',
        receipts: [
          {
            id: uuidv4(),
            receiptDate: yesterday,
            pcs: 1,
            grossWt: 28.1,
            netWt: 28.1,
            tunch: 91.6,
            wastage: 2.0,
            hishob: 93.6,
            fine: 26.3,
            weightLoss: 17.15,
            labourRate: 650,
            labourRateType: 'Gm',
            majuri: 18265,
            narration: 'Main necklace body received; matching earrings pending in polish.'
          }
        ]
      },
      {
        id: 'jw-order-003',
        orderNo: 'JW-0003',
        orderDate: yesterday,
        karigarId: karigar3,
        metal: 'Gold',
        itemId: goldBangles,
        grossWt: 32.5,
        netWt: 32.5,
        narration: 'Set of 4 traditional die-cut bangles size 2-6.',
        status: 'pending',
        receipts: []
      },
      {
        id: 'jw-order-004',
        orderNo: 'JW-0004',
        orderDate: today,
        karigarId: karigar2,
        metal: 'Silver',
        itemId: silverKada,
        grossWt: 120.0,
        netWt: 120.0,
        narration: 'Heavy tribal kada engraving with rhodium finish.',
        status: 'pending',
        receipts: []
      }
    ]

    for (const ord of ordersToSeed) {
      db.prepare(`
        INSERT OR REPLACE INTO job_work_orders (
          id, order_no, order_date, karigar_account_id, metal_type, item_id,
          gross_weight_given, net_weight_given, narration, status,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ord.id,
        ord.orderNo,
        ord.orderDate,
        ord.karigarId,
        ord.metal,
        ord.itemId,
        ord.grossWt,
        ord.netWt,
        ord.narration,
        ord.status,
        now,
        now
      )

      // Clear existing receipt lines for this order and re-insert
      db.prepare(`DELETE FROM job_work_receipt_lines WHERE job_work_order_id = ?`).run(ord.id)

      for (const rec of ord.receipts) {
        db.prepare(`
          INSERT INTO job_work_receipt_lines (
            id, job_work_order_id, receipt_date, pcs, gross_weight_received,
            net_weight_received, tunch, wastage, hishob, fine_received,
            weight_loss, labour_rate, labour_rate_type, majuri, narration, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          rec.id,
          ord.id,
          rec.receiptDate,
          rec.pcs,
          rec.grossWt,
          rec.netWt,
          rec.tunch,
          rec.wastage,
          rec.hishob,
          rec.fine,
          rec.weightLoss,
          rec.labourRate,
          rec.labourRateType,
          rec.majuri,
          rec.narration,
          now
        )
      }
    }

    console.log(`[SEED-JOB-WORK] Successfully seeded ${ordersToSeed.length} Job Work orders!`)
  } catch (err) {
    console.error(`[SEED-JOB-WORK] Error seeding into ${dbPath}:`, err)
  }
}
