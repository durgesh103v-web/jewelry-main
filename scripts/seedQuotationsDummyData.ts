import { app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) continue

  console.log(`Seeding quotation dummy data into ${dbPath}...`)
  const db = new Database(dbPath)

  // 1. Check or get default customer / account
  const customer = db.prepare(`SELECT id FROM customers WHERE mobile = '9876543210' OR id = 'cust-pos-001' LIMIT 1`).get() as any
  const customer2 = db.prepare(`SELECT id FROM customers WHERE mobile = '9820112233' OR id = 'cust-pos-002' LIMIT 1`).get() as any
  const customer3 = db.prepare(`SELECT id FROM customers WHERE mobile = '9988776655' OR id = 'cust-pos-003' LIMIT 1`).get() as any

  const cust1Id = customer?.id || 'cust-pos-001'
  const cust2Id = customer2?.id || 'cust-pos-002'
  const cust3Id = customer3?.id || 'cust-pos-003'

  let account = db.prepare(`SELECT id FROM accounts LIMIT 1`).get() as any
  let accountId = account?.id
  if (!accountId) {
    accountId = 'acc-default-sales'
    db.prepare(`
      INSERT OR IGNORE INTO accounts (id, account_name, account_type, active, created_at, updated_at)
      VALUES (?, 'Retail Walk-in Sales Account', 'CUSTOMER', 1, datetime('now'), datetime('now'))
    `).run(accountId)
  }

  // 2. Dates
  const today = new Date().toISOString().slice(0, 10)
  const validUntil3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const validUntil5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const validUntilYesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // 3. Insert Dummy Quotations
  const dummyQuotations = [
    {
      id: 'quot-pos-001',
      quotation_number: 'QT-2026-001',
      customer_id: cust1Id,
      account_id: accountId,
      quotation_date: today,
      valid_until: validUntil3Days,
      status: 'SENT',
      metal_type: 'Gold',
      total_pcs: 2,
      total_gross_weight: 39.050,
      total_net_weight: 39.050,
      total_fine_weight: 35.793,
      total_majuri: 26192.50,
      metal_rate_applied: 7250,
      metal_value: 283112.50,
      total_charges: 26192.50,
      discount_amount: 1500,
      taxable_amount: 307805.00,
      tax_amount: 9234.15,
      grand_total: 317039.15,
      rounded_total: 317040.00,
      notes: 'Wedding bridal set inquiry. 22K Hallmarked gold with antique temple finishing.',
      items: [
        {
          id: 'qitem-001-1',
          item_id: 'item-pos-g101',
          description: '22K Royal Bridal Gold Necklace',
          pcs: 1,
          gross_weight: 24.850,
          net_weight: 24.850,
          fine_weight: 22.777,
          metal_type: 'Gold',
          purity_name: '22K 916',
          tunch: 91.66,
          wastage: 2.5,
          gold_rate: 7250,
          metal_value: 180162.50,
          labour_rate: 650,
          labour_rate_type: 'Gram',
          making_charges: 16152.50,
          discount_amount: 1000,
          taxable_amount: 195315.00,
          tax_percent: 3,
          tax_amount: 5859.45,
          line_total: 201174.45,
          sort_order: 1
        },
        {
          id: 'qitem-001-2',
          item_id: 'item-pos-g104',
          description: '22K Antique Temple Jhumka Earrings',
          pcs: 1,
          gross_weight: 14.200,
          net_weight: 14.200,
          fine_weight: 13.016,
          metal_type: 'Gold',
          purity_name: '22K 916',
          tunch: 91.66,
          wastage: 3.0,
          gold_rate: 7250,
          metal_value: 102950.00,
          labour_rate: 700,
          labour_rate_type: 'Gram',
          making_charges: 9940.00,
          discount_amount: 500,
          taxable_amount: 112390.00,
          tax_percent: 3,
          tax_amount: 3371.70,
          line_total: 115761.70,
          sort_order: 2
        }
      ]
    },
    {
      id: 'quot-pos-002',
      quotation_number: 'QT-2026-002',
      customer_id: cust2Id,
      account_id: accountId,
      quotation_date: today,
      valid_until: validUntil5Days,
      status: 'ACCEPTED',
      metal_type: 'Gold',
      total_pcs: 1,
      total_gross_weight: 32.400,
      total_net_weight: 32.400,
      total_fine_weight: 29.698,
      total_majuri: 17820.00,
      metal_rate_applied: 7250,
      metal_value: 234900.00,
      total_charges: 17820.00,
      discount_amount: 1000,
      taxable_amount: 251720.00,
      tax_amount: 7551.60,
      grand_total: 259271.60,
      rounded_total: 259270.00,
      notes: 'Customer accepted estimate for Calcutta filigree bangles pair. Converting to order.',
      items: [
        {
          id: 'qitem-002-1',
          item_id: 'item-pos-g102',
          description: '22K Calcutta Filigree Bangles (Pair)',
          pcs: 1,
          gross_weight: 32.400,
          net_weight: 32.400,
          fine_weight: 29.698,
          metal_type: 'Gold',
          purity_name: '22K 916',
          tunch: 91.66,
          wastage: 2.0,
          gold_rate: 7250,
          metal_value: 234900.00,
          labour_rate: 550,
          labour_rate_type: 'Gram',
          making_charges: 17820.00,
          discount_amount: 1000,
          taxable_amount: 251720.00,
          tax_percent: 3,
          tax_amount: 7551.60,
          line_total: 259271.60,
          sort_order: 1
        }
      ]
    },
    {
      id: 'quot-pos-003',
      quotation_number: 'QT-2026-003',
      customer_id: cust3Id,
      account_id: accountId,
      quotation_date: today,
      valid_until: validUntil5Days,
      status: 'CONVERTED',
      metal_type: 'Gold',
      total_pcs: 1,
      total_gross_weight: 4.800,
      total_net_weight: 4.800,
      total_fine_weight: 3.600,
      total_majuri: 3500.00,
      metal_rate_applied: 5950,
      metal_value: 28560.00,
      total_charges: 3500.00,
      discount_amount: 500,
      taxable_amount: 71560.00,
      tax_amount: 2146.80,
      grand_total: 73706.80,
      rounded_total: 73710.00,
      notes: '18K Diamond Solitaire ring. Certified VVS-EF diamond studded.',
      items: [
        {
          id: 'qitem-003-1',
          item_id: 'item-pos-d201',
          description: '18K Solitaire Diamond Ring (VVS-EF)',
          pcs: 1,
          gross_weight: 4.800,
          net_weight: 4.800,
          fine_weight: 3.600,
          metal_type: 'Gold',
          purity_name: '18K 750',
          tunch: 75.00,
          wastage: 1.0,
          gold_rate: 5950,
          metal_value: 28560.00,
          labour_rate: 3500,
          labour_rate_type: 'Piece',
          making_charges: 3500.00,
          diamond_charges: 40000.00,
          discount_amount: 500,
          taxable_amount: 71560.00,
          tax_percent: 3,
          tax_amount: 2146.80,
          line_total: 73706.80,
          sort_order: 1
        }
      ]
    },
    {
      id: 'quot-pos-004',
      quotation_number: 'QT-2026-004',
      customer_id: cust1Id,
      account_id: accountId,
      quotation_date: today,
      valid_until: validUntilYesterday,
      status: 'EXPIRED',
      metal_type: 'Silver',
      total_pcs: 1,
      total_gross_weight: 250.000,
      total_net_weight: 250.000,
      total_fine_weight: 231.250,
      total_majuri: 8750.00,
      metal_rate_applied: 86.00,
      metal_value: 21500.00,
      total_charges: 8750.00,
      discount_amount: 250,
      taxable_amount: 30000.00,
      tax_amount: 900.00,
      grand_total: 30900.00,
      rounded_total: 30900.00,
      notes: '925 Sterling Silver Pooja Thali Set. Rate validity expired.',
      items: [
        {
          id: 'qitem-004-1',
          item_id: 'item-pos-s302',
          description: '925 Sterling Silver Pooja Thali Set',
          pcs: 1,
          gross_weight: 250.000,
          net_weight: 250.000,
          fine_weight: 231.250,
          metal_type: 'Silver',
          purity_name: '925 Silver',
          tunch: 92.50,
          wastage: 1.5,
          gold_rate: 86.00,
          metal_value: 21500.00,
          labour_rate: 35,
          labour_rate_type: 'Gram',
          making_charges: 8750.00,
          discount_amount: 250,
          taxable_amount: 30000.00,
          tax_percent: 3,
          tax_amount: 900.00,
          line_total: 30900.00,
          sort_order: 1
        }
      ]
    }
  ]

  const insertQuot = db.prepare(`
    INSERT OR REPLACE INTO quotations (
      id, quotation_number, customer_id, account_id, quotation_date,
      valid_until, status, metal_type, total_pcs, total_gross_weight,
      total_net_weight, total_fine_weight, total_majuri, metal_rate_applied,
      metal_value, total_charges, discount_amount, taxable_amount,
      tax_amount, grand_total, rounded_total, notes, created_at, updated_at
    ) VALUES (
      @id, @quotation_number, @customer_id, @account_id, @quotation_date,
      @valid_until, @status, @metal_type, @total_pcs, @total_gross_weight,
      @total_net_weight, @total_fine_weight, @total_majuri, @metal_rate_applied,
      @metal_value, @total_charges, @discount_amount, @taxable_amount,
      @tax_amount, @grand_total, @rounded_total, @notes, datetime('now'), datetime('now')
    )
  `)

  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO quotation_items (
      id, quotation_id, item_id, description, pcs, gross_weight,
      net_weight, fine_weight, metal_type, purity_name, tunch,
      wastage, gold_rate, metal_value, labour_rate, labour_rate_type,
      making_charges, diamond_charges, discount_amount, taxable_amount,
      tax_percent, tax_amount, line_total, sort_order, created_at, updated_at
    ) VALUES (
      @id, @quotation_id, @item_id, @description, @pcs, @gross_weight,
      @net_weight, @fine_weight, @metal_type, @purity_name, @tunch,
      @wastage, @gold_rate, @metal_value, @labour_rate, @labour_rate_type,
      @making_charges, @diamond_charges, @discount_amount, @taxable_amount,
      @tax_percent, @tax_amount, @line_total, @sort_order, datetime('now'), datetime('now')
    )
  `)

  for (const q of dummyQuotations) {
    insertQuot.run({
      id: q.id,
      quotation_number: q.quotation_number,
      customer_id: q.customer_id,
      account_id: q.account_id,
      quotation_date: q.quotation_date,
      valid_until: q.valid_until,
      status: q.status,
      metal_type: q.metal_type,
      total_pcs: q.total_pcs,
      total_gross_weight: q.total_gross_weight,
      total_net_weight: q.total_net_weight,
      total_fine_weight: q.total_fine_weight,
      total_majuri: q.total_majuri,
      metal_rate_applied: q.metal_rate_applied,
      metal_value: q.metal_value,
      total_charges: q.total_charges,
      discount_amount: q.discount_amount,
      taxable_amount: q.taxable_amount,
      tax_amount: q.tax_amount,
      grand_total: q.grand_total,
      rounded_total: q.rounded_total,
      notes: q.notes
    })

    for (const it of q.items) {
      insertItem.run({
        id: it.id,
        quotation_id: q.id,
        item_id: it.item_id,
        description: it.description,
        pcs: it.pcs,
        gross_weight: it.gross_weight,
        net_weight: it.net_weight,
        fine_weight: it.fine_weight,
        metal_type: it.metal_type,
        purity_name: it.purity_name,
        tunch: it.tunch,
        wastage: it.wastage,
        gold_rate: it.gold_rate,
        metal_value: it.metal_value,
        labour_rate: it.labour_rate,
        labour_rate_type: it.labour_rate_type,
        making_charges: it.making_charges,
        diamond_charges: (it as any).diamond_charges || 0,
        discount_amount: it.discount_amount,
        taxable_amount: it.taxable_amount,
        tax_percent: it.tax_percent,
        tax_amount: it.tax_amount,
        line_total: it.line_total,
        sort_order: it.sort_order
      })
    }
  }

  console.log(`✓ Quotation seed completed for ${dbPath}`)
  db.close()
}

app.quit()
