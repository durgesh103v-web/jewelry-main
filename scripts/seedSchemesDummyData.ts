import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-SCHEMES] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-SCHEMES] Seeding Gold Savings Scheme dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const todayStr = '2026-09-12'

    // 1. Fetch customers
    const customers = db.prepare('SELECT id, customer_code, name, mobile FROM customers WHERE deleted_at IS NULL ORDER BY customer_code ASC').all() as any[]
    if (customers.length === 0) {
      console.log('[SEED-SCHEMES] No customers found, skipping.')
      continue
    }

    const priya = customers.find((c) => c.customer_code === 'CUST-0001' || c.name?.includes('Priya')) || customers[0]
    const rajesh = customers.find((c) => c.customer_code === 'CUST-0002' || c.name?.includes('Rajesh')) || customers[1] || customers[0]
    const ananya = customers.find((c) => c.customer_code === 'CUST-0003' || c.name?.includes('Ananya')) || customers[2] || customers[0]
    const vikram = customers.find((c) => c.customer_code === 'CUST-0004' || c.name?.includes('Vikram')) || customers[3] || customers[0]
    const sunita = customers.find((c) => c.customer_code === 'CUST-0005' || c.name?.includes('Sunita')) || customers[4] || customers[0]

    // 2. Clear old scheme dummy data
    db.prepare('DELETE FROM scheme_timeline_events').run()
    db.prepare('DELETE FROM scheme_refunds').run()
    db.prepare('DELETE FROM scheme_redemptions').run()
    db.prepare('DELETE FROM scheme_installments').run()
    db.prepare('DELETE FROM scheme_accounts').run()
    db.prepare('DELETE FROM schemes').run()

    // 3. Seed Schemes Master
    const sch1Id = 'sch_master_001'
    db.prepare(`
      INSERT INTO schemes (
        id, scheme_code, scheme_name, scheme_type, duration_months,
        installment_type, fixed_installment_amount, bonus_type, bonus_value,
        description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sch1Id, 'SCH-11-1-STD', 'Swarna Varsha 11+1 Monthly Plan', 'MONEY_BASED', 11,
      'FIXED', 5000, 'ONE_MONTH_INSTALLMENT', 5000,
      'Pay 11 monthly installments of ₹5,000 and get 1 month installment (₹5,000) completely free from showroom on maturity.',
      1, todayStr, todayStr
    )

    const sch2Id = 'sch_master_002'
    db.prepare(`
      INSERT INTO schemes (
        id, scheme_code, scheme_name, scheme_type, duration_months,
        installment_type, fixed_installment_amount, bonus_type, bonus_value,
        description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sch2Id, 'SCH-DHAN-10K', 'Dhanteras Golden Kitty Plan', 'MONEY_BASED', 11,
      'FIXED', 10000, 'ONE_MONTH_INSTALLMENT', 10000,
      'Premium ₹10,000/month 11-month jewellery accumulator with ₹10,000 showroom bonus + 25% discount on making charges.',
      1, todayStr, todayStr
    )

    const sch3Id = 'sch_master_003'
    db.prepare(`
      INSERT INTO schemes (
        id, scheme_code, scheme_name, scheme_type, duration_months,
        installment_type, fixed_installment_amount, bonus_type, bonus_value,
        description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sch3Id, 'SCH-BRIDAL-25K', 'Royal Bridal Suvarna Sanchay', 'MONEY_BASED', 11,
      'FIXED', 25000, 'ONE_MONTH_INSTALLMENT', 25000,
      'Bespoke bridal jewellery accumulator with ₹25,000 final showroom gift voucher upon wedding order placement.',
      1, todayStr, todayStr
    )

    const sch4Id = 'sch_master_004'
    db.prepare(`
      INSERT INTO schemes (
        id, scheme_code, scheme_name, scheme_type, duration_months,
        installment_type, fixed_installment_amount, bonus_type, bonus_value,
        description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sch4Id, 'SCH-MICRO-2K', 'Shree Bachat Monthly Gold Kitty', 'MONEY_BASED', 11,
      'FIXED', 2000, 'ONE_MONTH_INSTALLMENT', 2000,
      'Pocket-friendly micro-deposit scheme with ₹2,000 annual bonus for gold coin and light jewellery purchases.',
      1, todayStr, todayStr
    )

    // 4. Seed 5 Enrolled Customer Scheme Accounts
    // Account 1: Priya Sharma - Swarna Varsha (10/11 Paid, ACTIVE)
    const acc1Id = 'sch_acc_001'
    db.prepare(`
      INSERT INTO scheme_accounts (
        id, account_number, scheme_id, customer_id, start_date, maturity_date,
        installment_amount, status, installments_expected, installments_paid,
        total_amount_paid, bonus_amount, gold_entitlement_grams, total_redeemed_amount,
        balance_amount, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acc1Id, 'GSS-2026-001', sch1Id, priya.id, '2025-11-12', '2026-10-12',
      5000, 'ACTIVE', 11, 10,
      50000, 5000, 0, 0,
      55000, '10 of 11 installments paid on time. 1 installment remaining for maturity.',
      '2025-11-12', todayStr
    )

    // Account 2: Rajesh Verma - Dhanteras Golden Kitty (11/11 Paid, MATURED)
    const acc2Id = 'sch_acc_002'
    db.prepare(`
      INSERT INTO scheme_accounts (
        id, account_number, scheme_id, customer_id, start_date, maturity_date,
        installment_amount, status, installments_expected, installments_paid,
        total_amount_paid, bonus_amount, gold_entitlement_grams, total_redeemed_amount,
        balance_amount, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acc2Id, 'GSS-2026-002', sch2Id, rajesh.id, '2025-10-05', '2026-09-05',
      10000, 'MATURED', 11, 11,
      110000, 10000, 0, 0,
      120000, 'Scheme fully matured! Available for direct POS billing purchase with full ₹10,000 bonus.',
      '2025-10-05', todayStr
    )

    // Account 3: Ananya Iyer - Bridal Suvarna Sanchay (6/11 Paid, ACTIVE)
    const acc3Id = 'sch_acc_003'
    db.prepare(`
      INSERT INTO scheme_accounts (
        id, account_number, scheme_id, customer_id, start_date, maturity_date,
        installment_amount, status, installments_expected, installments_paid,
        total_amount_paid, bonus_amount, gold_entitlement_grams, total_redeemed_amount,
        balance_amount, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acc3Id, 'GSS-2026-003', sch3Id, ananya.id, '2026-03-15', '2027-02-15',
      25000, 'ACTIVE', 11, 6,
      150000, 25000, 0, 0,
      175000, 'Halfway completed. Enrolled for upcoming December wedding delivery.',
      '2026-03-15', todayStr
    )

    // Account 4: Vikram Malhotra - Swarna Varsha (11/11 Paid & REDEEMED)
    const acc4Id = 'sch_acc_004'
    db.prepare(`
      INSERT INTO scheme_accounts (
        id, account_number, scheme_id, customer_id, start_date, maturity_date,
        installment_amount, status, installments_expected, installments_paid,
        total_amount_paid, bonus_amount, gold_entitlement_grams, total_redeemed_amount,
        balance_amount, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acc4Id, 'GSS-2026-004', sch1Id, vikram.id, '2025-08-01', '2026-07-01',
      5000, 'REDEEMED', 11, 11,
      55000, 5000, 0, 60000,
      0, 'Matured on July 2026 and redeemed against Diamond Necklace Invoice #INV-2026-081.',
      '2025-08-01', todayStr
    )

    // Account 5: Sunita Patel - Shree Bachat Monthly (3/11 Paid, ACTIVE)
    const acc5Id = 'sch_acc_005'
    db.prepare(`
      INSERT INTO scheme_accounts (
        id, account_number, scheme_id, customer_id, start_date, maturity_date,
        installment_amount, status, installments_expected, installments_paid,
        total_amount_paid, bonus_amount, gold_entitlement_grams, total_redeemed_amount,
        balance_amount, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acc5Id, 'GSS-2026-005', sch4Id, sunita.id, '2026-06-10', '2027-05-10',
      2000, 'ACTIVE', 11, 3,
      6000, 2000, 0, 0,
      8000, '3 monthly installments collected via UPI auto-pay.',
      '2026-06-10', todayStr
    )

    // 5. Seed installments for Account 1 (Priya - 10 installments)
    for (let m = 1; m <= 11; m++) {
      const isPaid = m <= 10
      const dueDate = `202${m <= 2 ? 6 : 5}-${String(((m + 10) % 12) + 1).padStart(2, '0')}-12`
      db.prepare(`
        INSERT INTO scheme_installments (
          id, scheme_account_id, installment_number, due_date, paid_date,
          due_amount, paid_amount, gold_rate, gold_entitlement_grams,
          payment_method, payment_reference, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `inst_p1_${m}`, acc1Id, m, dueDate, isPaid ? dueDate : null,
        5000, isPaid ? 5000 : 0, 7450, 0,
        isPaid ? 'UPI' : 'CASH', isPaid ? `UPI/9820194820/${m}` : '',
        isPaid ? 'PAID' : (m === 11 ? 'DUE' : 'DUE'),
        isPaid ? `Installment #${m} paid` : 'Upcoming due',
        todayStr
      )
    }

    // Seed Timeline Events
    db.prepare(`
      INSERT INTO scheme_timeline_events (id, scheme_account_id, event_type, description, performed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('evt_001', acc1Id, 'ENROLLMENT', 'Customer enrolled into Swarna Varsha 11+1 Scheme by Admin', 'Admin', '2025-11-12')

    db.prepare(`
      INSERT INTO scheme_timeline_events (id, scheme_account_id, event_type, description, performed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('evt_002', acc1Id, 'INSTALLMENT_PAID', 'Installment #10 of ₹5,000 recorded via UPI', 'Admin', todayStr)

    console.log(`[SEED-SCHEMES] Successfully seeded gold schemes dummy data into ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-SCHEMES] Error seeding schemes into ${dbPath}:`, err)
  } finally {
    db.close()
  }
}
