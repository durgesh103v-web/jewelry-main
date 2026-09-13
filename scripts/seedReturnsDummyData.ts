import { app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-RETURNS] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-RETURNS] Seeding Sales & Purchase Invoices for Returns testing into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const todayStr = new Date().toISOString().slice(0, 10)
    const recentDate1 = '2026-09-10'
    const recentDate2 = '2026-09-12'

    // 1. Ensure Account Groups
    let debtorGroup = db
      .prepare(
        `SELECT id FROM account_groups WHERE deleted_at IS NULL AND (group_name LIKE '%Debtor%' OR group_name LIKE '%Customer%' OR group_name LIKE '%Sundry%') LIMIT 1`
      )
      .get() as any
    if (!debtorGroup) {
      debtorGroup = db.prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL LIMIT 1`).get() as any
    }
    const defaultDebtorGroupId = debtorGroup?.id || 'grp-sundry-debtors'

    let creditorGroup = db
      .prepare(
        `SELECT id FROM account_groups WHERE deleted_at IS NULL AND (group_name LIKE '%Creditor%' OR group_name LIKE '%Supplier%') LIMIT 1`
      )
      .get() as any
    if (!creditorGroup) {
      creditorGroup = db.prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL LIMIT 1`).get() as any
    }
    const defaultCreditorGroupId = creditorGroup?.id || 'grp-sundry-creditors'

    // 2. Ensure Item Groups exist
    let goldGroup = db.prepare(`SELECT id FROM item_groups WHERE metal_type = 'Gold' LIMIT 1`).get() as any
    let goldGroupId = goldGroup?.id
    if (!goldGroupId) {
      goldGroupId = 'grp-gold-jewellery'
      db.prepare(`
        INSERT OR REPLACE INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
        VALUES (?, 'Gold Jewellery', 'Gold', 'Fine Gold Ornaments', 1, datetime('now'), datetime('now'))
      `).run(goldGroupId)
    }

    let silverGroup = db.prepare(`SELECT id FROM item_groups WHERE metal_type = 'Silver' LIMIT 1`).get() as any
    let silverGroupId = silverGroup?.id
    if (!silverGroupId) {
      silverGroupId = 'grp-silver-jewellery'
      db.prepare(`
        INSERT OR REPLACE INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
        VALUES (?, 'Silver Ornaments', 'Silver', 'Pure 92.5 Sterling Silver', 1, datetime('now'), datetime('now'))
      `).run(silverGroupId)
    }

    // 3. Ensure Customers exist
    const dummyCustomers = [
      {
        id: 'cust-ret-001',
        customer_code: 'CUST-RET-01',
        name: 'Smt. Priya Sharma',
        mobile: '9820194820',
        email: 'priya.sharma@example.com',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        pan: 'ABCPS1234F',
        gstin: '27ABCPS1234F1Z5'
      },
      {
        id: 'cust-ret-002',
        customer_code: 'CUST-RET-02',
        name: 'Shri Rajesh Verma',
        mobile: '9833409182',
        email: 'rajesh.verma@example.com',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
        pan: 'ABRPV5678G',
        gstin: '24ABRPV5678G1Z2'
      },
      {
        id: 'cust-ret-003',
        customer_code: 'CUST-RET-03',
        name: 'Smt. Ananya Singhania',
        mobile: '9920192841',
        email: 'ananya.s@example.com',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
        pan: 'ACDPS9988K',
        gstin: '08ACDPS9988K1Z9'
      }
    ]

    const custCols = (db.prepare(`PRAGMA table_info(customers)`).all() as any[]).map((c) => c.name)
    const nameCol = custCols.includes('customer_name') ? 'customer_name' : 'name'
    const panCol = custCols.includes('pan_no') ? 'pan_no' : 'pan'

    for (const c of dummyCustomers) {
      const existing = db.prepare(`SELECT id FROM customers WHERE id = ? OR mobile = ?`).get(c.id, c.mobile) as any
      if (!existing) {
        db.prepare(
          `INSERT INTO customers (id, customer_code, ${nameCol}, mobile, email, city, state, pincode, ${panCol}, gstin, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).run(c.id, c.customer_code, c.name, c.mobile, c.email, c.city, c.state, c.pincode, c.pan, c.gstin)
      }
    }

    // 4. Ensure Customer Accounts exist
    for (const c of dummyCustomers) {
      const accId = `acc_cust_${c.id}`
      const existingAcc = db.prepare(`SELECT id FROM accounts WHERE id = ?`).get(accId)
      if (!existingAcc) {
        db.prepare(
          `INSERT INTO accounts (id, account_name, other_name, account_group_id, mobile_number, city, state, pan_no, gst_no, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(accId, c.name, c.customer_code, defaultDebtorGroupId, c.mobile, c.city, c.state, c.pan, c.gstin)
      }
      db.prepare(`UPDATE customers SET account_id = ? WHERE id = ?`).run(accId, c.id)
    }

    // 5. Ensure Suppliers exist
    const dummySuppliers = [
      {
        id: 'sup-ret-001',
        supplier_code: 'SUP-RET-01',
        name: 'Zaveri Jewellers Bullion & Ornaments',
        mobile: '9820012345',
        email: 'info@zaverijewellers.com',
        city: 'Mumbai',
        state: 'Maharashtra',
        gstin: '27AABCZ1234F1Z8'
      },
      {
        id: 'sup-ret-002',
        supplier_code: 'SUP-RET-02',
        name: 'Rajkot Heritage Silver Crafts',
        mobile: '9825098765',
        email: 'sales@rajkotsilver.com',
        city: 'Rajkot',
        state: 'Gujarat',
        gstin: '24AABCR5678G1Z1'
      }
    ]

    for (const s of dummySuppliers) {
      const supAccId = `acc_sup_${s.id}`
      const existingSupAcc = db.prepare(`SELECT id FROM accounts WHERE id = ?`).get(supAccId)
      if (!existingSupAcc) {
        db.prepare(
          `INSERT INTO accounts (id, account_name, other_name, account_group_id, mobile_number, city, state, gst_no, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(supAccId, s.name, s.supplier_code, defaultCreditorGroupId, s.mobile, s.city, s.state, s.gstin)
      }

      const existingSup = db.prepare(`SELECT id FROM suppliers WHERE id = ? OR supplier_code = ?`).get(s.id, s.supplier_code)
      if (!existingSup) {
        db.prepare(
          `INSERT INTO suppliers (id, supplier_code, name, account_id, mobile, email, city, state, gstin, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(s.id, s.supplier_code, s.name, supAccId, s.mobile, s.email, s.city, s.state, s.gstin)
      }
    }

    // 6. Ensure Items exist
    const dummyItems = [
      {
        id: 'item-ret-g101',
        item_name: '22K Royal Kundan Bridal Necklace Set',
        metal_type: 'Gold',
        item_group_id: goldGroupId,
        barcode_value: 'TAG-RET-G101',
        fixed_weight_per_pcs: 35.5,
        default_tanch: 91.66,
        default_wastage: 2.5,
        default_labour_rate: 650,
        labour_rate_type: 'Gram'
      },
      {
        id: 'item-ret-g102',
        item_name: '22K Antique Calcutta Filigree Bangles (Pair)',
        metal_type: 'Gold',
        item_group_id: goldGroupId,
        barcode_value: 'TAG-RET-G102',
        fixed_weight_per_pcs: 28.2,
        default_tanch: 91.66,
        default_wastage: 2.0,
        default_labour_rate: 550,
        labour_rate_type: 'Gram'
      },
      {
        id: 'item-ret-d201',
        item_name: '18K Diamond Solitaire Engagement Ring',
        metal_type: 'Gold',
        item_group_id: goldGroupId,
        barcode_value: 'TAG-RET-D201',
        fixed_weight_per_pcs: 5.4,
        default_tanch: 75.0,
        default_wastage: 1.0,
        default_labour_rate: 3500,
        labour_rate_type: 'Piece'
      },
      {
        id: 'item-ret-s301',
        item_name: '925 Sterling Silver Antique Payal Set',
        metal_type: 'Silver',
        item_group_id: silverGroupId,
        barcode_value: 'TAG-RET-S301',
        fixed_weight_per_pcs: 95.0,
        default_tanch: 92.5,
        default_wastage: 1.5,
        default_labour_rate: 45,
        labour_rate_type: 'Gram'
      }
    ]

    for (const it of dummyItems) {
      const existingItem = db.prepare(`SELECT id FROM items WHERE id = ?`).get(it.id)
      if (!existingItem) {
        db.prepare(
          `INSERT INTO items (
             id, item_name, metal_type, item_group_id, barcode_item, barcode_value,
             fixed_weight_per_pcs, default_tanch, default_wastage,
             default_labour_rate, labour_rate_type, active, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(
          it.id,
          it.item_name,
          it.metal_type,
          it.item_group_id,
          it.barcode_value,
          it.fixed_weight_per_pcs,
          it.default_tanch,
          it.default_wastage,
          it.default_labour_rate,
          it.labour_rate_type
        )
      }
    }

    // 7. Seed Sales Invoices & Items
    const salesInvoices = [
      {
        id: 'inv-ret-001',
        invoice_number: 'INV-2026-001',
        customer_id: 'cust-ret-001',
        account_id: 'acc_cust_cust-ret-001',
        invoice_date: recentDate2,
        metal_type: 'Gold',
        total_pcs: 2,
        gross_weight: 63.7,
        net_weight: 63.7,
        fine_weight: 58.387,
        subtotal: 485200,
        taxable_amount: 485200,
        tax_amount: 14556,
        grand_total: 499756,
        paid_amount: 499756,
        balance_due: 0,
        status: 'COMPLETED',
        notes: 'Wedding jewellery purchase - Ready for return testing',
        items: [
          {
            id: 'inv-item-001-1',
            item_id: 'item-ret-g101',
            description: '22K Royal Kundan Bridal Necklace Set',
            barcode: 'TAG-RET-G101',
            pcs: 1,
            gross_weight: 35.5,
            net_weight: 35.5,
            metal_type: 'Gold',
            purity_name: '22K (916)',
            tunch: 91.66,
            wastage: 2.5,
            fine_weight: 32.539,
            gold_rate: 7250,
            metal_value: 257375,
            labour_rate: 650,
            labour_rate_type: 'Gram',
            making_charges: 23075,
            taxable_amount: 280450,
            tax_percent: 3.0,
            tax_amount: 8413.5,
            line_total: 288863.5
          },
          {
            id: 'inv-item-001-2',
            item_id: 'item-ret-g102',
            description: '22K Antique Calcutta Filigree Bangles (Pair)',
            barcode: 'TAG-RET-G102',
            pcs: 1,
            gross_weight: 28.2,
            net_weight: 28.2,
            metal_type: 'Gold',
            purity_name: '22K (916)',
            tunch: 91.66,
            wastage: 2.0,
            fine_weight: 25.848,
            gold_rate: 7250,
            metal_value: 204450,
            labour_rate: 550,
            labour_rate_type: 'Gram',
            making_charges: 15510,
            taxable_amount: 204750,
            tax_percent: 3.0,
            tax_amount: 6142.5,
            line_total: 210892.5
          }
        ]
      },
      {
        id: 'inv-ret-002',
        invoice_number: 'INV-2026-002',
        customer_id: 'cust-ret-002',
        account_id: 'acc_cust_cust-ret-002',
        invoice_date: recentDate1,
        metal_type: 'Gold',
        total_pcs: 1,
        gross_weight: 5.4,
        net_weight: 5.4,
        fine_weight: 4.05,
        subtotal: 78500,
        taxable_amount: 78500,
        tax_amount: 2355,
        grand_total: 80855,
        paid_amount: 80855,
        balance_due: 0,
        status: 'COMPLETED',
        notes: 'Solitaire ring sale',
        items: [
          {
            id: 'inv-item-002-1',
            item_id: 'item-ret-d201',
            description: '18K Diamond Solitaire Engagement Ring',
            barcode: 'TAG-RET-D201',
            pcs: 1,
            gross_weight: 5.4,
            net_weight: 5.4,
            metal_type: 'Gold',
            purity_name: '18K (750)',
            tunch: 75.0,
            wastage: 1.0,
            fine_weight: 4.05,
            gold_rate: 5950,
            metal_value: 32130,
            labour_rate: 3500,
            labour_rate_type: 'Piece',
            making_charges: 3500,
            diamond_charges: 42870,
            taxable_amount: 78500,
            tax_percent: 3.0,
            tax_amount: 2355,
            line_total: 80855
          }
        ]
      },
      {
        id: 'inv-ret-003',
        invoice_number: 'INV-2026-003',
        customer_id: 'cust-ret-003',
        account_id: 'acc_cust_cust-ret-003',
        invoice_date: todayStr,
        metal_type: 'Silver',
        total_pcs: 3,
        gross_weight: 285.0,
        net_weight: 285.0,
        fine_weight: 263.625,
        subtotal: 36765,
        taxable_amount: 36765,
        tax_amount: 1103,
        grand_total: 37868,
        paid_amount: 37868,
        balance_due: 0,
        status: 'COMPLETED',
        notes: 'Silver payals sale (3 pairs)',
        items: [
          {
            id: 'inv-item-003-1',
            item_id: 'item-ret-s301',
            description: '925 Sterling Silver Antique Payal Set',
            barcode: 'TAG-RET-S301',
            pcs: 3,
            gross_weight: 285.0,
            net_weight: 285.0,
            metal_type: 'Silver',
            purity_name: '925 Silver',
            tunch: 92.5,
            wastage: 1.5,
            fine_weight: 263.625,
            gold_rate: 86.0,
            metal_value: 24510,
            labour_rate: 45,
            labour_rate_type: 'Gram',
            making_charges: 12255,
            taxable_amount: 36765,
            tax_percent: 3.0,
            tax_amount: 1103,
            line_total: 37868
          }
        ]
      }
    ]

    for (const inv of salesInvoices) {
      db.prepare(
        `INSERT OR REPLACE INTO sales_invoices (
           id, invoice_number, customer_id, account_id, invoice_date, metal_type,
           total_pcs, gross_weight, net_weight, fine_weight, subtotal, taxable_amount,
           tax_amount, grand_total, paid_amount, balance_due, status, notes,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        inv.id,
        inv.invoice_number,
        inv.customer_id,
        inv.account_id,
        inv.invoice_date,
        inv.metal_type,
        inv.total_pcs,
        inv.gross_weight,
        inv.net_weight,
        inv.fine_weight,
        inv.subtotal,
        inv.taxable_amount,
        inv.tax_amount,
        inv.grand_total,
        inv.paid_amount,
        inv.balance_due,
        inv.status,
        inv.notes
      )

      for (const item of inv.items) {
        db.prepare(
          `INSERT OR REPLACE INTO sales_invoice_items (
             id, invoice_id, item_id, description, barcode, pcs, gross_weight,
             net_weight, metal_type, purity_name, tunch, wastage, fine_weight,
             gold_rate, metal_value, labour_rate, labour_rate_type, making_charges,
             taxable_amount, tax_percent, tax_amount, line_total,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).run(
          item.id,
          inv.id,
          item.item_id,
          item.description,
          item.barcode,
          item.pcs,
          item.gross_weight,
          item.net_weight,
          item.metal_type,
          item.purity_name,
          item.tunch,
          item.wastage,
          item.fine_weight,
          item.gold_rate,
          item.metal_value,
          item.labour_rate,
          item.labour_rate_type,
          item.making_charges,
          item.taxable_amount,
          item.tax_percent,
          item.tax_amount,
          item.line_total
        )
      }

      // Add payment record
      db.prepare(
        `INSERT OR REPLACE INTO sales_invoice_payments (
           id, invoice_id, payment_method, amount, payment_reference, payment_date, created_at, updated_at
         ) VALUES (?, ?, 'CASH', ?, 'SEED-CASH', ?, datetime('now'), datetime('now'))`
      ).run(`pay-${inv.id}`, inv.id, inv.grand_total, inv.invoice_date)
    }

    // 8. Seed Purchase Invoices (for Purchase Return verification)
    const purchaseInvoices = [
      {
        id: 'pur-ret-001',
        invoice_number: 'PUR-2026-001',
        supplier_id: 'sup-ret-001',
        account_id: 'acc_sup_sup-ret-001',
        supplier_invoice_number: 'ZAV/2026/892',
        invoice_date: recentDate1,
        metal_type: 'Gold',
        total_pcs: 5,
        gross_weight: 120.0,
        net_weight: 120.0,
        fine_weight: 109.992,
        subtotal: 825000,
        taxable_amount: 825000,
        tax_amount: 24750,
        grand_total: 849750,
        paid_amount: 849750,
        balance_due: 0,
        status: 'COMPLETED',
        notes: 'Bulk gold stock inward from Zaveri Jewellers',
        items: [
          {
            id: 'pur-item-001-1',
            item_id: 'item-ret-g101',
            description: '22K Royal Kundan Bridal Necklace Set (Inward Batch)',
            barcode: 'TAG-RET-G101',
            pcs: 5,
            gross_weight: 120.0,
            net_weight: 120.0,
            metal_type: 'Gold',
            purity_name: '22K (916)',
            tunch: 91.66,
            wastage: 1.5,
            fine_weight: 109.992,
            gold_rate: 6875,
            metal_value: 825000,
            taxable_amount: 825000,
            tax_percent: 3.0,
            tax_amount: 24750,
            line_total: 849750
          }
        ]
      }
    ]

    for (const pur of purchaseInvoices) {
      db.prepare(
        `INSERT OR REPLACE INTO purchase_invoices (
           id, invoice_number, supplier_id, account_id, supplier_invoice_number,
           invoice_date, metal_type, total_pcs, gross_weight, net_weight, fine_weight,
           subtotal, taxable_amount, tax_amount, grand_total, paid_amount, balance_due,
           status, notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        pur.id,
        pur.invoice_number,
        pur.supplier_id,
        pur.account_id,
        pur.supplier_invoice_number,
        pur.invoice_date,
        pur.metal_type,
        pur.total_pcs,
        pur.gross_weight,
        pur.net_weight,
        pur.fine_weight,
        pur.subtotal,
        pur.taxable_amount,
        pur.tax_amount,
        pur.grand_total,
        pur.paid_amount,
        pur.balance_due,
        pur.status,
        pur.notes
      )

      for (const item of pur.items) {
        db.prepare(
          `INSERT OR REPLACE INTO purchase_invoice_items (
             id, invoice_id, item_id, description, barcode, pcs, gross_weight,
             net_weight, metal_type, purity_name, tunch, wastage, fine_weight,
             gold_rate, metal_value, taxable_amount, tax_percent, tax_amount,
             line_total, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).run(
          item.id,
          pur.id,
          item.item_id,
          item.description,
          item.barcode,
          item.pcs,
          item.gross_weight,
          item.net_weight,
          item.metal_type,
          item.purity_name,
          item.tunch,
          item.wastage,
          item.fine_weight,
          item.gold_rate,
          item.metal_value,
          item.taxable_amount,
          item.tax_percent,
          item.tax_amount,
          item.line_total
        )
      }
    }

    console.log(`[SEED-RETURNS] ✓ Successfully seeded Sales & Purchase Invoices for ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-RETURNS] ✗ Error seeding data:`, err)
  } finally {
    db.close()
  }
}

if (app) {
  app.quit()
}
