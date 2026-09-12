import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-ADVANCES] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-ADVANCES] Seeding Customer Advances & Receipts dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const todayStr = '2026-09-12'

    // 1. Ensure an Account Group exists
    let debtorGroup = db.prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL AND (group_name LIKE '%Debtor%' OR group_name LIKE '%Customer%' OR group_name LIKE '%Sundry%') LIMIT 1`).get() as any
    if (!debtorGroup) {
      debtorGroup = db.prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL LIMIT 1`).get() as any
    }
    if (!debtorGroup) {
      const newGroupId = 'grp_sundry_debtors'
      try {
        db.prepare(`
          INSERT OR REPLACE INTO account_groups (id, group_name, group_type, description, active, created_at, updated_at)
          VALUES (?, 'Sundry Debtors', 'ASSET', 'Customer Ledger Group', 1, ?, ?)
        `).run(newGroupId, todayStr, todayStr)
        debtorGroup = { id: newGroupId }
      } catch (grpErr) {
        console.warn('[SEED-ADVANCES] Group error:', grpErr)
      }
    }
    const defaultGroupId = debtorGroup?.id || 'grp_sundry_debtors'

    // 2. Clean / update customers with realistic names
    const customers = db.prepare('SELECT id, name, account_id, customer_code FROM customers WHERE deleted_at IS NULL ORDER BY customer_code ASC').all() as any[]
    
    const cleanCustomerNames = [
      { code: 'CUST-0001', name: 'Smt. Priya Sharma', mobile: '9820194820', accountName: 'Priya Sharma' },
      { code: 'CUST-0002', name: 'Shri Rajesh Verma', mobile: '9833409182', accountName: 'Rajesh Verma' },
      { code: 'CUST-0003', name: 'Smt. Ananya Iyer', mobile: '9920192841', accountName: 'Ananya Iyer' },
      { code: 'CUST-0004', name: 'Shri Vikram Malhotra', mobile: '9819203810', accountName: 'Vikram Malhotra' },
      { code: 'CUST-0005', name: 'Smt. Sunita Patel', mobile: '9769018274', accountName: 'Sunita Patel' }
    ]

    for (let i = 0; i < customers.length && i < cleanCustomerNames.length; i++) {
      const cust = customers[i]
      const clean = cleanCustomerNames[i]

      let accId = cust.account_id
      if (!accId) {
        accId = `acc_cust_${cust.id}`
      }

      // Check if account already exists
      const existingAcc = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accId) as any
      if (!existingAcc) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO accounts (id, account_name, account_group_id, mobile_number, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(accId, clean.accountName, defaultGroupId, clean.mobile, todayStr, todayStr)
        } catch (accErr) {
          console.warn('[SEED-ADVANCES] Could not insert account:', accErr)
        }
      }

      // Update customer record
      db.prepare('UPDATE customers SET name = ?, mobile = ?, account_id = ? WHERE id = ?').run(clean.name, clean.mobile, accId, cust.id)
    }

    // Re-fetch updated customers & orders
    const updatedCustomers = db.prepare('SELECT id, name, account_id, customer_code FROM customers WHERE deleted_at IS NULL ORDER BY customer_code ASC').all() as any[]
    const orders = db.prepare('SELECT id, order_number, customer_id, account_id, grand_total, status FROM customer_orders WHERE deleted_at IS NULL').all() as any[]

    const priya = updatedCustomers.find((c) => c.customer_code === 'CUST-0001' || c.name?.includes('Priya')) || updatedCustomers[0]
    const rajesh = updatedCustomers.find((c) => c.customer_code === 'CUST-0002' || c.name?.includes('Rajesh')) || updatedCustomers[1] || updatedCustomers[0]
    const ananya = updatedCustomers.find((c) => c.customer_code === 'CUST-0003' || c.name?.includes('Ananya')) || updatedCustomers[2] || updatedCustomers[0]
    const vikram = updatedCustomers.find((c) => c.customer_code === 'CUST-0004' || c.name?.includes('Vikram')) || updatedCustomers[3] || updatedCustomers[0]

    const priyaAccId = priya.account_id || `acc_cust_${priya.id}`
    const rajeshAccId = rajesh.account_id || `acc_cust_${rajesh.id}`
    const ananyaAccId = ananya.account_id || `acc_cust_${ananya.id}`
    const vikramAccId = (vikram?.account_id) || `acc_cust_${vikram?.id || rajesh.id}`

    // Ensure these accounts exist in accounts table
    for (const [id, name, mob] of [
      [priyaAccId, 'Priya Sharma', '9820194820'],
      [rajeshAccId, 'Rajesh Verma', '9833409182'],
      [ananyaAccId, 'Ananya Iyer', '9920192841'],
      [vikramAccId, 'Vikram Malhotra', '9819203810']
    ]) {
      const acc = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id)
      if (!acc) {
        db.prepare(`
          INSERT OR IGNORE INTO accounts (id, account_name, account_group_id, mobile_number, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, name, defaultGroupId, mob, todayStr, todayStr)
      }
    }

    const ord1 = orders.find((o) => o.order_number === 'ORD-2026-001') || orders[0]
    const ord2 = orders.find((o) => o.order_number === 'ORD-2026-002') || orders[1]
    const ord3 = orders.find((o) => o.order_number === 'ORD-2026-003') || orders[2]

    // Clear existing dummy advances
    const dummyAdvanceNumbers = ['ADV-2026-001', 'ADV-2026-002', 'ADV-2026-003', 'ADV-2026-004', 'ADV-2026-005']
    const existingAdvances = db.prepare(`SELECT id FROM customer_advances WHERE advance_number IN (${dummyAdvanceNumbers.map(() => '?').join(',')})`).all(...dummyAdvanceNumbers) as any[]

    if (existingAdvances.length) {
      for (const adv of existingAdvances) {
        db.prepare(`DELETE FROM advance_allocations WHERE advance_id = ?`).run(adv.id)
        db.prepare(`DELETE FROM customer_advances WHERE id = ?`).run(adv.id)
      }
      console.log(`[SEED-ADVANCES] Cleared ${existingAdvances.length} existing dummy advances.`)
    }

    // Advance 1: ₹50,000 via UPI (Linked to ORD-2026-001) - FULLY_ALLOCATED
    const adv1Id = 'seed_adv_001'
    db.prepare(`
      INSERT INTO customer_advances (
        id, advance_number, customer_id, account_id, order_id, amount, allocated_amount,
        payment_method, payment_reference, advance_date, status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adv1Id, 'ADV-2026-001', priya.id, priyaAccId, ord1?.id || null, 50000, 50000,
      'UPI', 'UPI/948201948201/GPay', '2026-09-10', 'FULLY_ALLOCATED',
      'Booking token advance received for Bridal Kundan Necklace Set (ORD-2026-001).',
      'Admin', todayStr, todayStr
    )

    if (ord1) {
      db.prepare(`
        INSERT INTO advance_allocations (
          id, advance_id, order_id, allocated_amount, allocation_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'seed_alloc_001', adv1Id, ord1.id, 50000, '2026-09-10',
        'Auto-allocated to Custom Order #ORD-2026-001', todayStr, todayStr
      )
    }

    // Advance 2: ₹40,000 via HDFC Bank Transfer (Linked to ORD-2026-002) - FULLY_ALLOCATED
    const adv2Id = 'seed_adv_002'
    db.prepare(`
      INSERT INTO customer_advances (
        id, advance_number, customer_id, account_id, order_id, amount, allocated_amount,
        payment_method, payment_reference, advance_date, status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adv2Id, 'ADV-2026-002', rajesh.id, rajeshAccId, ord2?.id || null, 40000, 40000,
      'BANK', 'HDFCN26090812904', '2026-09-08', 'FULLY_ALLOCATED',
      'Advance for Solid Gold Lion Face Kada & Navratna Ring order.',
      'Admin', todayStr, todayStr
    )

    if (ord2) {
      db.prepare(`
        INSERT INTO advance_allocations (
          id, advance_id, order_id, allocated_amount, allocation_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'seed_alloc_002', adv2Id, ord2.id, 40000, '2026-09-08',
        'Allocated against Custom Order #ORD-2026-002', todayStr, todayStr
      )
    }

    // Advance 3: ₹25,000 via Cash (Linked to ORD-2026-003) - FULLY_ALLOCATED
    const adv3Id = 'seed_adv_003'
    db.prepare(`
      INSERT INTO customer_advances (
        id, advance_number, customer_id, account_id, order_id, amount, allocated_amount,
        payment_method, payment_reference, advance_date, status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adv3Id, 'ADV-2026-003', ananya.id, ananyaAccId, ord3?.id || null, 25000, 25000,
      'CASH', 'CSH-REC/26/0912', '2026-09-12', 'FULLY_ALLOCATED',
      'Cash deposit for 18K Diamond Mangalsutra booking.',
      'Admin', todayStr, todayStr
    )

    if (ord3) {
      db.prepare(`
        INSERT INTO advance_allocations (
          id, advance_id, order_id, allocated_amount, allocation_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'seed_alloc_003', adv3Id, ord3.id, 25000, '2026-09-12',
        'Allocated against Custom Order #ORD-2026-003', todayStr, todayStr
      )
    }

    // Advance 4: ₹75,000 via UPI (Unlinked general customer credit) - RECEIVED (Available)
    const adv4Id = 'seed_adv_004'
    db.prepare(`
      INSERT INTO customer_advances (
        id, advance_number, customer_id, account_id, order_id, amount, allocated_amount,
        payment_method, payment_reference, advance_date, status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adv4Id, 'ADV-2026-004', priya.id, priyaAccId, null, 75000, 0,
      'UPI', 'UPI/771920381029/Paytm', '2026-09-11', 'RECEIVED',
      'Festival booking deposit. Usable for Dhanteras jewellery purchase or custom order.',
      'Admin', todayStr, todayStr
    )

    // Advance 5: ₹1,00,000 via Cheque (Unlinked customer ledger deposit) - RECEIVED (Available)
    const adv5Id = 'seed_adv_005'
    db.prepare(`
      INSERT INTO customer_advances (
        id, advance_number, customer_id, account_id, order_id, amount, allocated_amount,
        payment_method, payment_reference, advance_date, status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adv5Id, 'ADV-2026-005', (vikram?.id || rajesh.id), vikramAccId, null, 100000, 0,
      'CHEQUE', 'CHQ#440912 / ICICI Bank Fort Branch', '2026-09-12', 'RECEIVED',
      'Advance deposit against upcoming family wedding purchases.',
      'Admin', todayStr, todayStr
    )

    console.log(`[SEED-ADVANCES] Successfully seeded 5 customer advance receipts into ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-ADVANCES] Error seeding advances into ${dbPath}:`, err)
  } finally {
    db.close()
  }
}
