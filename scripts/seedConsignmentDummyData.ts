import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-CONSIGNMENT] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-CONSIGNMENT] Seeding Consignment & Memo dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const todayStr = '2026-09-12'

    // 1. Ensure Suppliers exist
    const defaultSuppliers = [
      {
        id: 'sup_surat_diamonds',
        code: 'SUP-001',
        name: 'Surat Diamond Crafts & Export Pvt Ltd',
        mobile: '9820112233',
        address: 'Varachha Road, Surat, Gujarat',
        gst: '24AACCS1234F1Z5'
      },
      {
        id: 'sup_jaipur_gems',
        code: 'SUP-002',
        name: 'Jaipur Heritage Polki & Gem Importers',
        mobile: '9829012345',
        address: 'Johari Bazaar, Jaipur, Rajasthan',
        gst: '08AABCJ5678K1Z2'
      },
      {
        id: 'sup_zaveri_jewels',
        code: 'SUP-003',
        name: 'Zaveri Antique Jewels & Casting House',
        mobile: '9820987654',
        address: 'Kalbadevi Road, Zaveri Bazaar, Mumbai',
        gst: '27AABFZ9012M1Z8'
      }
    ]

    for (const s of defaultSuppliers) {
      db.prepare(`
        INSERT OR REPLACE INTO suppliers (
          id, supplier_code, name, mobile, address, gstin, pan, active, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'ABCDE1234F', 1, ?, ?
        )
      `).run(s.id, s.code, s.name, s.mobile, s.address, s.gst, todayStr, todayStr)
    }

    // 2. Ensure Master Items exist
    let items = db.prepare('SELECT id, item_name, metal_type FROM items WHERE deleted_at IS NULL').all() as any[]
    if (items.length === 0) {
      const defaultItems = [
        { id: 'item_dia_ring', name: '18K Diamond Solitaire Ring', metal: 'GOLD' },
        { id: 'item_emerald_set', name: '18K Zambian Emerald Bridal Choker Set', metal: 'GOLD' },
        { id: 'item_polki_necklace', name: '22K Royal Polki & Pearl Haar', metal: 'GOLD' },
        { id: 'item_ruby_bangles', name: '22K Burmese Ruby Kada Bangles', metal: 'GOLD' }
      ]
      for (const it of defaultItems) {
        db.prepare(`
          INSERT OR REPLACE INTO items (id, item_name, metal_type, active, created_at, updated_at)
          VALUES (?, ?, ?, 1, ?, ?)
        `).run(it.id, it.name, it.metal, todayStr, todayStr)
      }
      items = db.prepare('SELECT id, item_name, metal_type FROM items WHERE deleted_at IS NULL').all() as any[]
    }

    // 3. Clear existing consignment tables for fresh clean dummy data
    db.prepare('DELETE FROM consignment_inwards').run()
    db.prepare('DELETE FROM consignment_items').run()
    db.prepare('DELETE FROM consignment_returns').run()
    db.prepare('DELETE FROM consignment_return_items').run()
    db.prepare('DELETE FROM consignment_settlements').run()

    // 4. Create Physical Stock Items for Consignment
    const stockItemsData = [
      {
        id: 'stk_cs_001',
        stock_item_code: 'CS-STK-001',
        barcode: 'BC-CS-001',
        item_id: items[0]?.id || 'item_dia_ring',
        gross_weight: 4.800,
        net_weight: 4.500,
        fine_weight: 3.375,
        purity_name: '18K',
        tunch: 75.0,
        metal_type: 'GOLD',
        cost_price: 180000,
        selling_price: 225000,
        status: 'IN_STOCK'
      },
      {
        id: 'stk_cs_002',
        stock_item_code: 'CS-STK-002',
        barcode: 'BC-CS-002',
        item_id: items[1]?.id || 'item_emerald_set',
        gross_weight: 62.500,
        net_weight: 55.000,
        fine_weight: 41.250,
        purity_name: '18K',
        tunch: 75.0,
        metal_type: 'GOLD',
        cost_price: 270000,
        selling_price: 340000,
        status: 'IN_STOCK'
      },
      {
        id: 'stk_cs_003',
        stock_item_code: 'CS-STK-003',
        barcode: 'BC-CS-003',
        item_id: items[2]?.id || 'item_polki_necklace',
        gross_weight: 85.000,
        net_weight: 72.000,
        fine_weight: 65.952,
        purity_name: '22K',
        tunch: 91.6,
        metal_type: 'GOLD',
        cost_price: 320000,
        selling_price: 410000,
        status: 'SOLD'
      },
      {
        id: 'stk_cs_004',
        stock_item_code: 'CS-STK-004',
        barcode: 'BC-CS-004',
        item_id: items[3]?.id || 'item_ruby_bangles',
        gross_weight: 48.000,
        net_weight: 44.000,
        fine_weight: 40.304,
        purity_name: '22K',
        tunch: 91.6,
        metal_type: 'GOLD',
        cost_price: 140000,
        selling_price: 185000,
        status: 'IN_STOCK'
      },
      {
        id: 'stk_cs_005',
        stock_item_code: 'CS-STK-005',
        barcode: 'BC-CS-005',
        item_id: items[0]?.id || 'item_dia_ring',
        gross_weight: 6.200,
        net_weight: 5.800,
        fine_weight: 4.350,
        purity_name: '18K',
        tunch: 75.0,
        metal_type: 'GOLD',
        cost_price: 290000,
        selling_price: 365000,
        status: 'SOLD'
      },
      {
        id: 'stk_cs_006',
        stock_item_code: 'CS-STK-006',
        barcode: 'BC-CS-006',
        item_id: items[1]?.id || 'item_emerald_set',
        gross_weight: 38.500,
        net_weight: 35.000,
        fine_weight: 26.250,
        purity_name: '18K',
        tunch: 75.0,
        metal_type: 'GOLD',
        cost_price: 165000,
        selling_price: 215000,
        status: 'IN_STOCK'
      }
    ]

    for (const stk of stockItemsData) {
      db.prepare(`
        INSERT OR REPLACE INTO jewellery_stock_items (
          id, stock_item_code, barcode, item_id, status, gross_weight, net_weight, fine_weight,
          purity_name, tunch, location, created_at, updated_at
        ) VALUES (
          @id, @stock_item_code, @barcode, @item_id, @status, @gross_weight, @net_weight, @fine_weight,
          @purity_name, @tunch, 'SHOWROOM_MEMO', '${todayStr}', '${todayStr}'
        )
      `).run(stk)
    }

    // 5. Insert Consignment Inwards (Memos)
    const inwardsData = [
      {
        id: 'ci_001',
        consignment_number: 'MEMO-2026-001',
        supplier_id: 'sup_surat_diamonds',
        inward_date: '2026-09-08',
        expected_return_date: '2026-09-22',
        status: 'ACTIVE',
        settlement_status: 'UNSETTLED',
        total_pieces: 2,
        total_gross_weight: 67.300,
        total_vendor_cost: 450000,
        total_settled_amount: 0,
        notes: 'High-value Solitaire rings and Zambian emerald necklace for showroom festival display'
      },
      {
        id: 'ci_002',
        consignment_number: 'MEMO-2026-002',
        supplier_id: 'sup_zaveri_jewels',
        inward_date: '2026-09-02',
        expected_return_date: '2026-09-16',
        status: 'PARTIALLY_SETTLED',
        settlement_status: 'PARTIALLY_SETTLED',
        total_pieces: 2,
        total_gross_weight: 133.000,
        total_vendor_cost: 460000,
        total_settled_amount: 180000,
        notes: 'Antique Polki necklace (Sold) & Ruby kada bangles (In showroom custody)'
      },
      {
        id: 'ci_003',
        consignment_number: 'MEMO-2026-003',
        supplier_id: 'sup_jaipur_gems',
        inward_date: '2026-08-28',
        expected_return_date: '2026-09-11',
        status: 'COMPLETED',
        settlement_status: 'SETTLED',
        total_pieces: 1,
        total_gross_weight: 6.200,
        total_vendor_cost: 290000,
        total_settled_amount: 290000,
        notes: 'Bespoke diamond cocktail ring sold during bridal trunk show and fully settled via bank transfer'
      },
      {
        id: 'ci_004',
        consignment_number: 'MEMO-2026-004',
        supplier_id: 'sup_surat_diamonds',
        inward_date: '2026-08-25',
        expected_return_date: '2026-09-08', // Overdue by 4 days
        status: 'ACTIVE',
        settlement_status: 'UNSETTLED',
        total_pieces: 1,
        total_gross_weight: 38.500,
        total_vendor_cost: 165000,
        total_settled_amount: 0,
        notes: 'Diamond tennis bracelet on memo approval. Return date passed.'
      }
    ]

    const insertInward = db.prepare(`
      INSERT INTO consignment_inwards (
        id, consignment_number, supplier_id, inward_date, expected_return_date,
        status, settlement_status, total_pieces, total_gross_weight, total_vendor_cost,
        total_settled_amount, notes, created_by, created_at, updated_at
      ) VALUES (
        @id, @consignment_number, @supplier_id, @inward_date, @expected_return_date,
        @status, @settlement_status, @total_pieces, @total_gross_weight, @total_vendor_cost,
        @total_settled_amount, @notes, 'Admin', @inward_date, '${todayStr}'
      )
    `)

    for (const inv of inwardsData) {
      insertInward.run(inv)
    }

    // 6. Insert Consignment Items
    const itemsData = [
      // MEMO-001 (2 items, both IN_SHOWROOM)
      {
        id: 'citem_001',
        consignment_inward_id: 'ci_001',
        supplier_id: 'sup_surat_diamonds',
        stock_item_id: 'stk_cs_001',
        item_id: items[0]?.id || 'item_dia_ring',
        vendor_item_code: 'SD-RNG-101',
        gross_weight: 4.800,
        net_weight: 4.500,
        fine_weight: 3.375,
        purity_name: '18K',
        tunch: 75.0,
        vendor_cost: 180000,
        retail_price: 225000,
        status: 'IN_SHOWROOM'
      },
      {
        id: 'citem_002',
        consignment_inward_id: 'ci_001',
        supplier_id: 'sup_surat_diamonds',
        stock_item_id: 'stk_cs_002',
        item_id: items[1]?.id || 'item_emerald_set',
        vendor_item_code: 'SD-NCK-202',
        gross_weight: 62.500,
        net_weight: 55.000,
        fine_weight: 41.250,
        purity_name: '18K',
        tunch: 75.0,
        vendor_cost: 270000,
        retail_price: 340000,
        status: 'IN_SHOWROOM'
      },
      // MEMO-002 (2 items: 1 SOLD, 1 IN_SHOWROOM)
      {
        id: 'citem_003',
        consignment_inward_id: 'ci_002',
        supplier_id: 'sup_zaveri_jewels',
        stock_item_id: 'stk_cs_003',
        item_id: items[2]?.id || 'item_polki_necklace',
        vendor_item_code: 'ZAV-PLK-303',
        gross_weight: 85.000,
        net_weight: 72.000,
        fine_weight: 65.952,
        purity_name: '22K',
        tunch: 91.6,
        vendor_cost: 320000,
        retail_price: 410000,
        status: 'SOLD',
        sold_at: '2026-09-09'
      },
      {
        id: 'citem_004',
        consignment_inward_id: 'ci_002',
        supplier_id: 'sup_zaveri_jewels',
        stock_item_id: 'stk_cs_004',
        item_id: items[3]?.id || 'item_ruby_bangles',
        vendor_item_code: 'ZAV-KAD-404',
        gross_weight: 48.000,
        net_weight: 44.000,
        fine_weight: 40.304,
        purity_name: '22K',
        tunch: 91.6,
        vendor_cost: 140000,
        retail_price: 185000,
        status: 'IN_SHOWROOM'
      },
      // MEMO-003 (1 item, SOLD & SETTLED)
      {
        id: 'citem_005',
        consignment_inward_id: 'ci_003',
        supplier_id: 'sup_jaipur_gems',
        stock_item_id: 'stk_cs_005',
        item_id: items[0]?.id || 'item_dia_ring',
        vendor_item_code: 'JPG-DIA-505',
        gross_weight: 6.200,
        net_weight: 5.800,
        fine_weight: 4.350,
        purity_name: '18K',
        tunch: 75.0,
        vendor_cost: 290000,
        retail_price: 365000,
        status: 'SOLD',
        sold_at: '2026-09-04'
      },
      // MEMO-004 (1 item, IN_SHOWROOM overdue)
      {
        id: 'citem_006',
        consignment_inward_id: 'ci_004',
        supplier_id: 'sup_surat_diamonds',
        stock_item_id: 'stk_cs_006',
        item_id: items[1]?.id || 'item_emerald_set',
        vendor_item_code: 'SD-BRC-606',
        gross_weight: 38.500,
        net_weight: 35.000,
        fine_weight: 26.250,
        purity_name: '18K',
        tunch: 75.0,
        vendor_cost: 165000,
        retail_price: 215000,
        status: 'IN_SHOWROOM'
      }
    ]

    const insertItem = db.prepare(`
      INSERT INTO consignment_items (
        id, consignment_inward_id, supplier_id, stock_item_id, item_id, vendor_item_code,
        gross_weight, net_weight, fine_weight, purity_name, tunch, vendor_cost, retail_price,
        status, sold_at, created_at, updated_at
      ) VALUES (
        @id, @consignment_inward_id, @supplier_id, @stock_item_id, @item_id, @vendor_item_code,
        @gross_weight, @net_weight, @fine_weight, @purity_name, @tunch, @vendor_cost, @retail_price,
        @status, @sold_at, '${todayStr}', '${todayStr}'
      )
    `)

    for (const itm of itemsData) {
      insertItem.run({
        ...itm,
        sold_at: itm.sold_at || null
      })
    }

    // 7. Insert Settlements
    const settlementsData = [
      {
        id: 'cset_001',
        settlement_number: 'SET-2026-001',
        supplier_id: 'sup_zaveri_jewels',
        consignment_inward_id: 'ci_002',
        settlement_date: '2026-09-10',
        settled_amount: 180000,
        payment_method: 'BANK',
        payment_reference: 'NEFT-HDFC-9921004',
        notes: 'Partial settlement for sold Polki necklace'
      },
      {
        id: 'cset_002',
        settlement_number: 'SET-2026-002',
        supplier_id: 'sup_jaipur_gems',
        consignment_inward_id: 'ci_003',
        settlement_date: '2026-09-06',
        settled_amount: 290000,
        payment_method: 'BANK',
        payment_reference: 'RTGS-ICICI-8812993',
        notes: 'Full payment for sold diamond cocktail ring'
      }
    ]

    const insertSettlement = db.prepare(`
      INSERT INTO consignment_settlements (
        id, settlement_number, supplier_id, consignment_inward_id, settlement_date,
        settled_amount, payment_method, payment_reference, notes, created_by, created_at
      ) VALUES (
        @id, @settlement_number, @supplier_id, @consignment_inward_id, @settlement_date,
        @settled_amount, @payment_method, @payment_reference, @notes, 'Admin', @settlement_date
      )
    `)

    for (const st of settlementsData) {
      insertSettlement.run(st)
    }

    console.log(`[SEED-CONSIGNMENT] Successfully seeded Consignment Memos, Items, and Settlements into ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-CONSIGNMENT] Error seeding data into ${dbPath}:`, err)
  } finally {
    db.close()
  }
}
