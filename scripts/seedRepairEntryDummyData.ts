import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    continue
  }

  console.log(`[SEED-REPAIRS] Seeding Repair Entry dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const fourDaysAgo = new Date(Date.now() - 345600000).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Get or create Customer Accounts
    let customerGroup = db
      .prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL AND (group_name LIKE '%Debtor%' OR group_name LIKE '%Customer%') LIMIT 1`)
      .get() as any

    if (!customerGroup) {
      customerGroup = db.prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL LIMIT 1`).get() as any
    }

    const ensureAccount = (id: string, name: string, phone: string) => {
      const existing = db.prepare(`SELECT id FROM accounts WHERE id = ? OR account_name = ?`).get(id, name) as any
      if (existing) return existing.id
      db.prepare(`
        INSERT INTO accounts (id, account_name, account_group_id, mobile_number, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, customerGroup ? customerGroup.id : 'grp-debtors', phone, now, now)
      return id
    }

    const cust1 = ensureAccount('acc-cust-priya', 'Priya Sharma (Retail)', '9820556677')
    const cust2 = ensureAccount('acc-cust-vikram', 'Vikramaditya Mehta', '9819443322')
    const cust3 = ensureAccount('acc-cust-anita', 'Anita Deshmukh', '9892113344')

    // 2. Seed Repair Entries across all statuses
    const repairsToSeed = [
      {
        id: 'rep-entry-001',
        repairNo: 'REP-0001',
        receiptDate: fourDaysAgo,
        accountId: cust1,
        phone: '9820556677',
        itemDesc: '22K Gold Antique Ring with CZ Stone',
        metalType: 'Gold',
        approxWt: 5.450,
        workDesc: 'Ring size extension to 14, prong tightening, rhodium buffing',
        estCharge: 850,
        actualCharge: 850,
        status: 'delivered',
        completedDate: twoDaysAgo,
        deliveredDate: yesterday,
        narration: 'Delivered to customer in velvet box. Cash payment received.'
      },
      {
        id: 'rep-entry-002',
        repairNo: 'REP-0002',
        receiptDate: threeDaysAgo,
        accountId: cust2,
        phone: '9819443322',
        itemDesc: 'Silver Bombay Payal (Pair) with Bells',
        metalType: 'Silver',
        approxWt: 142.200,
        workDesc: 'Hook link soldering, replace 6 missing ghungroo bells, silver dip polish',
        estCharge: 450,
        actualCharge: 500,
        status: 'completed',
        completedDate: yesterday,
        deliveredDate: null,
        narration: 'Work completed by Karigar Babubhai. Ready on display counter for customer pickup.'
      },
      {
        id: 'rep-entry-003',
        repairNo: 'REP-0003',
        receiptDate: yesterday,
        accountId: cust3,
        phone: '9892113344',
        itemDesc: '18K Diamond Tennis Bracelet (Round Cut)',
        metalType: 'Diamond',
        approxWt: 12.800,
        workDesc: 'Safety lock repair, micro-prong inspection on 3 loose diamonds',
        estCharge: 1800,
        actualCharge: null,
        status: 'received',
        completedDate: null,
        deliveredDate: null,
        narration: 'Customer requested laser lock alignment. In custody with master goldsmith.'
      },
      {
        id: 'rep-entry-004',
        repairNo: 'REP-0004',
        receiptDate: today,
        accountId: cust1,
        phone: '9820556677',
        itemDesc: 'Gold Mangalsutra Chain 22K (Short)',
        metalType: 'Gold',
        approxWt: 18.150,
        workDesc: 'Black bead re-stringing and clasp replacement',
        estCharge: 600,
        actualCharge: null,
        status: 'received',
        completedDate: null,
        deliveredDate: null,
        narration: 'Urgent by tomorrow evening.'
      }
    ]

    for (const rep of repairsToSeed) {
      db.prepare(`
        INSERT OR REPLACE INTO repair_entries (
          id, repair_no, receipt_date, account_id, phone, item_description,
          metal_type, approx_weight, work_description, estimated_charge, actual_charge,
          status, completed_date, delivered_date, narration, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rep.id,
        rep.repairNo,
        rep.receiptDate,
        rep.accountId,
        rep.phone,
        rep.itemDesc,
        rep.metalType,
        rep.approxWt,
        rep.workDesc,
        rep.estCharge,
        rep.actualCharge,
        rep.status,
        rep.completedDate,
        rep.deliveredDate,
        rep.narration,
        now,
        now
      )
    }

    console.log(`[SEED-REPAIRS] Successfully seeded ${repairsToSeed.length} Repair entries!`)
  } catch (err) {
    console.error(`[SEED-REPAIRS] Error seeding into ${dbPath}:`, err)
  }
}
