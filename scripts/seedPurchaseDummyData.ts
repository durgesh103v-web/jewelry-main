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
    console.log(`[SEED-PURCHASES] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-PURCHASES] Seeding Suppliers, Catalog Items & Barcodes into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const todayStr = new Date().toISOString().slice(0, 10)

    // 1. Ensure Account Groups
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

    // 3. Ensure Item Stamps exist
    let stamp22k = db.prepare(`SELECT id FROM item_stamps WHERE stamp_name LIKE '%916%' OR stamp_name LIKE '%22K%' LIMIT 1`).get() as any
    let stamp22kId = stamp22k?.id
    if (!stamp22kId) {
      stamp22kId = 'stamp-22k-916'
      db.prepare(`
        INSERT OR REPLACE INTO item_stamps (id, stamp_name, metal_type, purity_karat, purity_tanch, description, active, created_at, updated_at)
        VALUES (?, '22K 916', 'Gold', '22K', 91.66, 'Hallmarked 22 Karat 916 Gold', 1, datetime('now'), datetime('now'))
      `).run(stamp22kId)
    }

    let stamp18k = db.prepare(`SELECT id FROM item_stamps WHERE stamp_name LIKE '%750%' OR stamp_name LIKE '%18K%' LIMIT 1`).get() as any
    let stamp18kId = stamp18k?.id
    if (!stamp18kId) {
      stamp18kId = 'stamp-18k-750'
      db.prepare(`
        INSERT OR REPLACE INTO item_stamps (id, stamp_name, metal_type, purity_karat, purity_tanch, description, active, created_at, updated_at)
        VALUES (?, '18K 750', 'Gold', '18K', 75.00, 'Hallmarked 18 Karat 750 Gold', 1, datetime('now'), datetime('now'))
      `).run(stamp18kId)
    }

    let stamp925 = db.prepare(`SELECT id FROM item_stamps WHERE stamp_name LIKE '%925%' OR stamp_name LIKE '%Silver%' LIMIT 1`).get() as any
    let stamp925Id = stamp925?.id
    if (!stamp925Id) {
      stamp925Id = 'stamp-925-silver'
      db.prepare(`
        INSERT OR REPLACE INTO item_stamps (id, stamp_name, metal_type, purity_karat, purity_tanch, description, active, created_at, updated_at)
        VALUES (?, '925 Silver', 'Silver', '92.5%', 92.50, '925 Sterling Silver', 1, datetime('now'), datetime('now'))
      `).run(stamp925Id)
    }

    // 4. Ensure Rich Suppliers exist
    const dummySuppliers = [
      {
        id: 'sup-pur-001',
        supplier_code: 'SUP-ZAV-01',
        name: 'Zaveri Jewellers Bullion & Ornaments',
        mobile: '9820012345',
        email: 'info@zaverijewellers.com',
        city: 'Mumbai',
        state: 'Maharashtra',
        gstin: '27AABCZ1234F1Z8'
      },
      {
        id: 'sup-pur-002',
        supplier_code: 'SUP-RAJ-02',
        name: 'Rajkot Heritage Silver Crafts',
        mobile: '9825098765',
        email: 'sales@rajkotsilver.com',
        city: 'Rajkot',
        state: 'Gujarat',
        gstin: '24AABCR5678G1Z1'
      },
      {
        id: 'sup-pur-003',
        supplier_code: 'SUP-SUR-03',
        name: 'Surat Diamond Merchants & Co.',
        mobile: '9879123456',
        email: 'contact@suratdiamonds.in',
        city: 'Surat',
        state: 'Gujarat',
        gstin: '24AABCS9876E1Z4'
      },
      {
        id: 'sup-pur-004',
        supplier_code: 'SUP-KOL-04',
        name: 'Kolkata Filigree Goldsmiths Guild',
        mobile: '9830112233',
        email: 'guild@kolkatagold.com',
        city: 'Kolkata',
        state: 'West Bengal',
        gstin: '19AABCK4567M1Z7'
      }
    ]

    for (const s of dummySuppliers) {
      let acc = db.prepare(`SELECT id FROM accounts WHERE account_name = ? OR id = ?`).get(s.name, `acc_sup_${s.id}`) as any
      let supAccId = acc?.id
      if (!supAccId) {
        supAccId = `acc_sup_${s.id}`
        db.prepare(
          `INSERT INTO accounts (id, account_name, other_name, account_group_id, mobile_number, city, state, gst_no, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(supAccId, s.name, s.supplier_code, defaultCreditorGroupId, s.mobile, s.city, s.state, s.gstin)
      }

      const existingSup = db.prepare(`SELECT id FROM suppliers WHERE id = ? OR supplier_code = ? OR name = ?`).get(s.id, s.supplier_code, s.name)
      if (!existingSup) {
        db.prepare(
          `INSERT INTO suppliers (id, supplier_code, name, account_id, mobile, email, city, state, gstin, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(s.id, s.supplier_code, s.name, supAccId, s.mobile, s.email, s.city, s.state, s.gstin)
      }
    }

    // 5. Ensure Scannable Items with Barcodes exist
    const catalogItems = [
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
        fixed_weight_per_pcs: 24.85,
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
        fixed_weight_per_pcs: 32.4,
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
        fixed_weight_per_pcs: 8.5,
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
        fixed_weight_per_pcs: 14.2,
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
        fixed_weight_per_pcs: 4.8,
        default_tanch: 75.0,
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
        fixed_weight_per_pcs: 85.0,
        default_tanch: 92.5,
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
        fixed_weight_per_pcs: 250.0,
        default_tanch: 92.5,
        default_wastage: 1.5,
        default_labour_rate: 35,
        labour_rate_type: 'Gram',
        active: 1
      }
    ]

    for (const it of catalogItems) {
      db.prepare(`
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
          @labour_rate_type, @active, datetime('now'), datetime('now'))
      `).run(it)
    }

    // 6. Ensure Daily Rates exist in gold_rates table
    try {
      const rateCols = (db.prepare(`PRAGMA table_info(gold_rates)`).all() as any[]).map((c) => c.name)
      if (rateCols.length > 0) {
        const rates = [
          { id: 'rate-g-24k', metal_type: 'Gold', purity_name: '24K (999)', purity_karat: '24K', fineness: 99.9, rate_per_gram: 7850 },
          { id: 'rate-g-22k', metal_type: 'Gold', purity_name: '22K (916)', purity_karat: '22K', fineness: 91.66, rate_per_gram: 7250 },
          { id: 'rate-g-18k', metal_type: 'Gold', purity_name: '18K (750)', purity_karat: '18K', fineness: 75.0, rate_per_gram: 5950 },
          { id: 'rate-s-fine', metal_type: 'Silver', purity_name: 'Fine Silver 999', purity_karat: null, fineness: 99.9, rate_per_gram: 92.5 },
          { id: 'rate-s-925', metal_type: 'Silver', purity_name: '925 Silver', purity_karat: null, fineness: 92.5, rate_per_gram: 86.0 }
        ]

        for (const r of rates) {
          db.prepare(`
            INSERT OR REPLACE INTO gold_rates (
              id, metal_type, purity_name, purity_karat, fineness, rate_per_gram,
              effective_date, effective_time, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, '00:00:00', 1, datetime('now'), datetime('now'))
          `).run(r.id, r.metal_type, r.purity_name, r.purity_karat, r.fineness, r.rate_per_gram, todayStr)
        }
      }
    } catch (e) {
      console.log('[SEED-PURCHASES] gold_rates:', e)
    }

    console.log(`[SEED-PURCHASES] ✓ Completed seeding for ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-PURCHASES] ✗ Error seeding data:`, err)
  } finally {
    db.close()
  }
}

if (app) {
  app.quit()
}
