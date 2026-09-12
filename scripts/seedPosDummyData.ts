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

  console.log(`Seeding dummy data into ${dbPath}...`)
  const db = new Database(dbPath)

  // 1. Ensure Item Groups
  let goldGroup = db.prepare(`SELECT id FROM item_groups WHERE metal_type = 'Gold' LIMIT 1`).get() as any
  let goldGroupId = goldGroup?.id
  if (!goldGroupId) {
    goldGroupId = 'grp-gold-jewellery'
    db.prepare(`
      INSERT OR REPLACE INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(goldGroupId, 'Gold Jewellery', 'Gold', 'Fine Gold Ornaments')
  }

  let silverGroup = db.prepare(`SELECT id FROM item_groups WHERE metal_type = 'Silver' LIMIT 1`).get() as any
  let silverGroupId = silverGroup?.id
  if (!silverGroupId) {
    silverGroupId = 'grp-silver-jewellery'
    db.prepare(`
      INSERT OR REPLACE INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(silverGroupId, 'Silver Ornaments', 'Silver', 'Pure 92.5 Sterling Silver')
  }

  // 2. Ensure Item Stamps
  let stamp22k = db.prepare(`SELECT id FROM item_stamps WHERE stamp_name LIKE '%916%' OR stamp_name LIKE '%22K%' LIMIT 1`).get() as any
  let stamp22kId = stamp22k?.id
  if (!stamp22kId) {
    stamp22kId = 'stamp-22k-916'
    db.prepare(`
      INSERT OR REPLACE INTO item_stamps (id, stamp_name, metal_type, purity_karat, purity_tanch, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(stamp22kId, '22K 916', 'Gold', '22K', 91.66, 'Hallmarked 22 Karat 916 Gold')
  }

  let stamp18k = db.prepare(`SELECT id FROM item_stamps WHERE stamp_name LIKE '%750%' OR stamp_name LIKE '%18K%' LIMIT 1`).get() as any
  let stamp18kId = stamp18k?.id
  if (!stamp18kId) {
    stamp18kId = 'stamp-18k-750'
    db.prepare(`
      INSERT OR REPLACE INTO item_stamps (id, stamp_name, metal_type, purity_karat, purity_tanch, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(stamp18kId, '18K 750', 'Gold', '18K', 75.00, 'Hallmarked 18 Karat 750 Gold')
  }

  let stamp925 = db.prepare(`SELECT id FROM item_stamps WHERE stamp_name LIKE '%925%' OR stamp_name LIKE '%Silver%' LIMIT 1`).get() as any
  let stamp925Id = stamp925?.id
  if (!stamp925Id) {
    stamp925Id = 'stamp-925-silver'
    db.prepare(`
      INSERT OR REPLACE INTO item_stamps (id, stamp_name, metal_type, purity_karat, purity_tanch, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(stamp925Id, '925 Silver', 'Silver', '92.5%', 92.50, '925 Sterling Silver')
  }

  // 3. Ensure Realistic Items with Barcodes, HUIDs & Rates
  const dummyItems = [
    {
      id: 'item-pos-g101',
      item_name: '22K Royal Bridal Gold Necklace',
      metal_type: 'Gold',
      item_group_id: goldGroupId,
      default_stamp_id: stamp22kId,
      barcode_item: 1,
      barcode_type: 'CODE128',
      barcode_value: 'TAG-G101',
      labour_charges_by: 'Weight',
      sale_purchase_by: 'Weight',
      gst_hsn_code: '71131910',
      fixed_weight_per_pcs: 24.850,
      default_tanch: 91.66,
      default_wastage: 2.5,
      default_labour_rate: 650,
      labour_rate_type: 'Gram',
      active: 1
    },
    {
      id: 'item-pos-g102',
      item_name: '22K Calcutta Filigree Bangles (Pair)',
      metal_type: 'Gold',
      item_group_id: goldGroupId,
      default_stamp_id: stamp22kId,
      barcode_item: 1,
      barcode_type: 'CODE128',
      barcode_value: 'TAG-G102',
      labour_charges_by: 'Weight',
      sale_purchase_by: 'Weight',
      gst_hsn_code: '71131910',
      fixed_weight_per_pcs: 32.400,
      default_tanch: 91.66,
      default_wastage: 2.0,
      default_labour_rate: 550,
      labour_rate_type: 'Gram',
      active: 1
    },
    {
      id: 'item-pos-g103',
      item_name: '22K Lightweight Daily Wear Gold Chain',
      metal_type: 'Gold',
      item_group_id: goldGroupId,
      default_stamp_id: stamp22kId,
      barcode_item: 1,
      barcode_type: 'CODE128',
      barcode_value: 'TAG-G103',
      labour_charges_by: 'Weight',
      sale_purchase_by: 'Weight',
      gst_hsn_code: '71131910',
      fixed_weight_per_pcs: 8.500,
      default_tanch: 91.66,
      default_wastage: 1.5,
      default_labour_rate: 450,
      labour_rate_type: 'Gram',
      active: 1
    },
    {
      id: 'item-pos-g104',
      item_name: '22K Antique Temple Jhumka Earrings',
      metal_type: 'Gold',
      item_group_id: goldGroupId,
      default_stamp_id: stamp22kId,
      barcode_item: 1,
      barcode_type: 'CODE128',
      barcode_value: 'TAG-G104',
      labour_charges_by: 'Weight',
      sale_purchase_by: 'Weight',
      gst_hsn_code: '71131910',
      fixed_weight_per_pcs: 14.200,
      default_tanch: 91.66,
      default_wastage: 3.0,
      default_labour_rate: 700,
      labour_rate_type: 'Gram',
      active: 1
    },
    {
      id: 'item-pos-d201',
      item_name: '18K Solitaire Diamond Ring (VVS-EF)',
      metal_type: 'Gold',
      item_group_id: goldGroupId,
      default_stamp_id: stamp18kId,
      barcode_item: 1,
      barcode_type: 'CODE128',
      barcode_value: 'TAG-D201',
      labour_charges_by: 'Fixed',
      sale_purchase_by: 'Piece',
      gst_hsn_code: '71131950',
      fixed_weight_per_pcs: 4.800,
      default_tanch: 75.00,
      default_wastage: 1.0,
      default_labour_rate: 3500,
      labour_rate_type: 'Piece',
      active: 1
    },
    {
      id: 'item-pos-s301',
      item_name: '925 Pure Silver Antique Payal (Anklet)',
      metal_type: 'Silver',
      item_group_id: silverGroupId,
      default_stamp_id: stamp925Id,
      barcode_item: 1,
      barcode_type: 'CODE128',
      barcode_value: 'TAG-S301',
      labour_charges_by: 'Weight',
      sale_purchase_by: 'Weight',
      gst_hsn_code: '71131120',
      fixed_weight_per_pcs: 85.000,
      default_tanch: 92.50,
      default_wastage: 1.0,
      default_labour_rate: 45,
      labour_rate_type: 'Gram',
      active: 1
    },
    {
      id: 'item-pos-s302',
      item_name: '925 Sterling Silver Pooja Thali Set',
      metal_type: 'Silver',
      item_group_id: silverGroupId,
      default_stamp_id: stamp925Id,
      barcode_item: 1,
      barcode_type: 'CODE128',
      barcode_value: 'TAG-S302',
      labour_charges_by: 'Weight',
      sale_purchase_by: 'Weight',
      gst_hsn_code: '71131130',
      fixed_weight_per_pcs: 250.000,
      default_tanch: 92.50,
      default_wastage: 1.5,
      default_labour_rate: 35,
      labour_rate_type: 'Gram',
      active: 1
    }
  ]

  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO items (
      id, item_name, metal_type, item_group_id, default_stamp_id,
      barcode_item, barcode_type, barcode_value, labour_charges_by,
      sale_purchase_by, gst_hsn_code, fixed_weight_per_pcs,
      default_tanch, default_wastage, default_labour_rate,
      labour_rate_type, active, created_at, updated_at
    ) VALUES (
      @id, @item_name, @metal_type, @item_group_id, @default_stamp_id,
      @barcode_item, @barcode_type, @barcode_value, @labour_charges_by,
      @sale_purchase_by, @gst_hsn_code, @fixed_weight_per_pcs,
      @default_tanch, @default_wastage, @default_labour_rate,
      @labour_rate_type, @active, datetime('now'), datetime('now')
    )
  `)

  for (const it of dummyItems) {
    insertItem.run(it)
  }

  // 4. Ensure Customers
  const dummyCustomers = [
    {
      id: 'cust-pos-001',
      customer_code: 'CUST-001',
      name: 'Priya Sharma',
      mobile: '9876543210',
      email: 'priya.sharma@example.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      pan: 'ABCPS1234F',
      gstin: '27ABCPS1234F1Z5'
    },
    {
      id: 'cust-pos-002',
      customer_code: 'CUST-002',
      name: 'Rajesh Verma',
      mobile: '9820112233',
      email: 'rajesh.verma@example.com',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380001',
      pan: 'ABRPV5678G',
      gstin: ''
    },
    {
      id: 'cust-pos-003',
      customer_code: 'CUST-003',
      name: 'Ananya Singhania',
      mobile: '9988776655',
      email: 'ananya.s@example.com',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302001',
      pan: 'ACDPS9988K',
      gstin: ''
    }
  ]

  const custCols = (db.prepare(`PRAGMA table_info(customers)`).all() as any[]).map(c => c.name)
  const nameCol = custCols.includes('customer_name') ? 'customer_name' : 'name'
  const panCol = custCols.includes('pan_no') ? 'pan_no' : 'pan'

  for (const c of dummyCustomers) {
    const existing = db.prepare(`SELECT id FROM customers WHERE mobile = ? OR id = ?`).get(c.mobile, c.id)
    if (!existing) {
      db.prepare(`
        INSERT INTO customers (id, customer_code, ${nameCol}, mobile, email, city, state, pincode, ${panCol}, gstin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(c.id, c.customer_code, c.name, c.mobile, c.email, c.city, c.state, c.pincode, c.pan, c.gstin)
    }
  }

  // 5. Ensure Daily Metal Rates exist so rate lookup works seamlessly
  const today = new Date().toISOString().slice(0, 10)
  try {
    const ratesExist = db.prepare(`SELECT count(*) as c FROM daily_rates`).get() as any
    if (ratesExist && ratesExist.c === 0) {
      db.prepare(`
        INSERT OR REPLACE INTO daily_rates (id, rate_date, metal_type, purity_percent, rate_per_gram)
        VALUES 
          ('rate-gold-24k', ?, 'Gold', 99.90, 7850),
          ('rate-gold-22k', ?, 'Gold', 91.66, 7250),
          ('rate-gold-18k', ?, 'Gold', 75.00, 5950),
          ('rate-silver-fine', ?, 'Silver', 99.90, 92.5),
          ('rate-silver-925', ?, 'Silver', 92.50, 86.0)
      `).run(today, today, today, today, today)
    }
  } catch (e) {
    console.log('daily_rates note:', e)
  }

  console.log(`✓ Seed completed successfully for ${dbPath}`)
  db.close()
}

app.quit()
