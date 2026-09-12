import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-MFG] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-MFG] Seeding Manufacturing & Karigar dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const todayStr = '2026-09-12'

    // 1. Ensure Items exist
    let items = db.prepare('SELECT id, item_name, metal_type FROM items WHERE deleted_at IS NULL').all() as any[]
    if (items.length === 0) {
      const defaultItems = [
        { id: 'item_gold_necklace', name: '22K Antique Bridal Necklace', metal: 'GOLD' },
        { id: 'item_diamond_ring', name: '18K Diamond Solitaire Engagement Ring', metal: 'GOLD' },
        { id: 'item_gold_bangles', name: '22K Royal Filigree Kada Bangles', metal: 'GOLD' },
        { id: 'item_gold_pendant', name: '22K Temple Peacock Pendant', metal: 'GOLD' }
      ]
      for (const it of defaultItems) {
        db.prepare(`
          INSERT OR REPLACE INTO items (id, item_name, metal_type, active, created_at, updated_at)
          VALUES (?, ?, ?, 1, ?, ?)
        `).run(it.id, it.name, it.metal, todayStr, todayStr)
      }
      items = db.prepare('SELECT id, item_name, metal_type FROM items WHERE deleted_at IS NULL').all() as any[]
    }

    // 2. Ensure Karigars exist
    const defaultKarigars = [
      {
        id: 'karigar_ramesh',
        code: 'KAR-001',
        name: 'Ramesh Soni (Goldsmith)',
        specialization: 'Handmade Antique & Casting',
        fineGoldBal: 12.450
      },
      {
        id: 'karigar_suresh',
        code: 'KAR-002',
        name: 'Suresh Verma (Setter)',
        specialization: 'Diamond & Precious Stone Setting',
        fineGoldBal: 3.500
      },
      {
        id: 'karigar_anil',
        code: 'KAR-003',
        name: 'Anil Jadhav (Polisher)',
        specialization: 'High-Gloss Buffing & Rhodium Plating',
        fineGoldBal: 0.850
      }
    ]

    for (const k of defaultKarigars) {
      db.prepare(`
        INSERT OR REPLACE INTO karigars (
          id, karigar_code, name, mobile, address, specialization, fine_gold_balance, fine_silver_balance, active, created_at, updated_at
        ) VALUES (
          ?, ?, ?, '9820011223', 'Zaveri Bazaar, Mumbai', ?, ?, 0, 1, ?, ?
        )
      `).run(k.id, k.code, k.name, k.specialization, k.fineGoldBal, todayStr, todayStr)
    }

    // 3. Clear existing manufacturing tables for fresh clean dummy data
    db.prepare('DELETE FROM manufacturing_orders').run()
    db.prepare('DELETE FROM manufacturing_material_issues').run()
    db.prepare('DELETE FROM manufacturing_receipts').run()
    db.prepare('DELETE FROM manufacturing_material_returns').run()
    db.prepare('DELETE FROM karigar_metal_ledger').run()

    const ordersData = [
      {
        id: 'mo_001',
        order_number: 'MO-2026-001',
        item_id: items[0]?.id || 'item_gold_necklace',
        karigar_id: 'karigar_ramesh',
        planned_pcs: 1,
        planned_gross_weight: 48.000,
        planned_net_weight: 45.000,
        metal_type: 'GOLD',
        purity_name: '22K',
        target_fine_weight: 41.220,
        expected_delivery_date: '2026-09-10',
        status: 'COMPLETED',
        total_issued_gross: 46.400,
        total_issued_fine: 42.502,
        total_returned_fine: 0,
        total_finished_fine: 41.220,
        total_approved_loss: 1.282,
        unreconciled_fine: 0,
        notes: 'Bespoke bridal antique choker set with pearl drop settings'
      },
      {
        id: 'mo_002',
        order_number: 'MO-2026-002',
        item_id: items[1]?.id || 'item_diamond_ring',
        karigar_id: 'karigar_suresh',
        planned_pcs: 1,
        planned_gross_weight: 4.800,
        planned_net_weight: 4.500,
        metal_type: 'GOLD',
        purity_name: '18K',
        target_fine_weight: 3.375,
        expected_delivery_date: '2026-09-16',
        status: 'IN_PROGRESS',
        total_issued_gross: 4.800,
        total_issued_fine: 3.600,
        total_returned_fine: 0,
        total_finished_fine: 0,
        total_approved_loss: 0,
        unreconciled_fine: 3.600,
        notes: '18K White gold 6-prong solitaire ring, 1.05ct IGI center diamond'
      },
      {
        id: 'mo_003',
        order_number: 'MO-2026-003',
        item_id: items[2]?.id || 'item_gold_bangles',
        karigar_id: 'karigar_ramesh',
        planned_pcs: 2,
        planned_gross_weight: 40.000,
        planned_net_weight: 38.000,
        metal_type: 'GOLD',
        purity_name: '22K',
        target_fine_weight: 34.808,
        expected_delivery_date: '2026-09-14',
        status: 'PARTIALLY_RECEIVED',
        total_issued_gross: 42.000,
        total_issued_fine: 38.472,
        total_returned_fine: 0,
        total_finished_fine: 17.404,
        total_approved_loss: 0.500,
        unreconciled_fine: 20.568,
        notes: 'Pair of Royal Calcutta filigree handmade kada bangles with screw lock'
      },
      {
        id: 'mo_004',
        order_number: 'MO-2026-004',
        item_id: items[3]?.id || 'item_gold_pendant',
        karigar_id: 'karigar_anil',
        planned_pcs: 1,
        planned_gross_weight: 12.500,
        planned_net_weight: 12.000,
        metal_type: 'GOLD',
        purity_name: '22K',
        target_fine_weight: 10.992,
        expected_delivery_date: '2026-09-18',
        status: 'APPROVED',
        total_issued_gross: 0,
        total_issued_fine: 0,
        total_returned_fine: 0,
        total_finished_fine: 0,
        total_approved_loss: 0,
        unreconciled_fine: 0,
        notes: '22K Nakshi temple peacock pendant with ruby eye accents'
      }
    ]

    const insertOrder = db.prepare(`
      INSERT INTO manufacturing_orders (
        id, order_number, item_id, karigar_id, planned_pcs, planned_gross_weight, planned_net_weight,
        metal_type, purity_name, target_fine_weight, expected_delivery_date, status,
        total_issued_gross, total_issued_fine, total_returned_fine, total_finished_fine, total_approved_loss, unreconciled_fine,
        notes, created_by, created_at, updated_at
      ) VALUES (
        @id, @order_number, @item_id, @karigar_id, @planned_pcs, @planned_gross_weight, @planned_net_weight,
        @metal_type, @purity_name, @target_fine_weight, @expected_delivery_date, @status,
        @total_issued_gross, @total_issued_fine, @total_returned_fine, @total_finished_fine, @total_approved_loss, @unreconciled_fine,
        @notes, 'Admin', '${todayStr}', '${todayStr}'
      )
    `)

    for (const o of ordersData) {
      insertOrder.run(o)
    }

    // 4. Material Issues
    const insertIssue = db.prepare(`
      INSERT INTO manufacturing_material_issues (
        id, issue_number, order_id, karigar_id, issue_type, metal_type, purity_name, tunch,
        gross_weight, net_weight, fine_weight, stone_weight, stone_pcs, diamond_carats, diamond_pcs,
        issue_date, notes, created_at
      ) VALUES (
        ?, ?, ?, ?, 'INITIAL', 'GOLD', ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `)

    // Issue for MO-001
    insertIssue.run(
      'iss_001', 'ISS-2026-001', 'mo_001', 'karigar_ramesh', '22K', 91.6,
      46.400, 46.400, 42.502, 0, 0, 0, 0,
      '2026-09-02', 'Issued 24K pure gold granules + alloy for 22K melting', '2026-09-02'
    )

    // Issue for MO-002
    insertIssue.run(
      'iss_002', 'ISS-2026-002', 'mo_002', 'karigar_suresh', '18K', 75.0,
      4.800, 4.800, 3.600, 0, 0, 1.05, 1,
      '2026-09-08', 'Issued 18K white gold alloy + 1.05ct Solitaire diamond', '2026-09-08'
    )

    // Issue for MO-003
    insertIssue.run(
      'iss_003', 'ISS-2026-003', 'mo_003', 'karigar_ramesh', '22K', 91.6,
      42.000, 42.000, 38.472, 0, 0, 0, 0,
      '2026-09-05', 'Issued 22K gold wire and sheet for handmade filigree', '2026-09-05'
    )

    // 5. Finished Goods Receipts (table: manufacturing_receipts)
    const insertReceipt = db.prepare(`
      INSERT INTO manufacturing_receipts (
        id, receipt_number, order_id, karigar_id, item_id, pcs,
        gross_weight, less_weight, net_weight, purity_name, tunch, fine_weight,
        wastage_percent, actual_wastage_weight, process_loss_weight, scrap_weight,
        labour_rate, labour_rate_type, labour_amount, qc_status, receipt_date, notes, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 'Gm', ?, 'APPROVED', ?, ?, ?
      )
    `)

    // Receipt for MO-001
    insertReceipt.run(
      'rcp_001', 'RCP-2026-001', 'mo_001', 'karigar_ramesh', items[0]?.id || 'item_gold_necklace', 1,
      48.150, 3.150, 45.000, '22K', 91.6, 41.220,
      3.0, 1.350, 0.000, 0.000,
      650, 29250, '2026-09-10', 'Antique bridal choker completed. Hallmark 916 verified.', '2026-09-10'
    )

    // Receipt for MO-003 (1 of 2 bangles)
    insertReceipt.run(
      'rcp_002', 'RCP-2026-002', 'mo_003', 'karigar_ramesh', items[2]?.id || 'item_gold_bangles', 1,
      19.200, 0.200, 19.000, '22K', 91.6, 17.404,
      3.0, 0.570, 0.000, 0.000,
      700, 13300, '2026-09-11', '1st kada bangle finished and hallmarked. 2nd bangle in progress.', '2026-09-11'
    )

    // 6. Karigar Metal Ledger entries
    const insertLedger = db.prepare(`
      INSERT INTO karigar_metal_ledger (
        id, karigar_id, entry_date, metal_type, document_type, document_id, document_number,
        fine_issued, fine_returned, fine_received, approved_loss, running_fine_balance, narration, created_at
      ) VALUES (
        ?, ?, ?, 'GOLD', ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `)

    // Ledger for Ramesh Soni
    insertLedger.run(
      'kml_001', 'karigar_ramesh', '2026-09-02', 'ISSUE', 'iss_001', 'ISS-2026-001',
      42.502, 0, 0, 0, 42.502, 'Fine gold issued for MO-2026-001', '2026-09-02'
    )
    insertLedger.run(
      'kml_002', 'karigar_ramesh', '2026-09-05', 'ISSUE', 'iss_003', 'ISS-2026-003',
      38.472, 0, 0, 0, 80.974, 'Fine gold issued for MO-2026-003', '2026-09-05'
    )
    insertLedger.run(
      'kml_003', 'karigar_ramesh', '2026-09-10', 'RECEIPT', 'rcp_001', 'RCP-2026-001',
      0, 0, 41.220, 0, 39.754, 'Finished necklace received', '2026-09-10'
    )
    insertLedger.run(
      'kml_004', 'karigar_ramesh', '2026-09-10', 'LOSS_ADJUSTMENT', 'mo_001', 'AUDIT-MO-001',
      0, 0, 0, 1.282, 38.472, 'Wastage & burning loss approved', '2026-09-10'
    )
    insertLedger.run(
      'kml_005', 'karigar_ramesh', '2026-09-11', 'RECEIPT', 'rcp_002', 'RCP-2026-002',
      0, 0, 17.404, 0, 21.068, '1st kada bangle received', '2026-09-11'
    )

    // Ledger for Suresh Verma
    insertLedger.run(
      'kml_006', 'karigar_suresh', '2026-09-08', 'ISSUE', 'iss_002', 'ISS-2026-002',
      3.600, 0, 0, 0, 3.600, '18K white gold issued for ring setting', '2026-09-08'
    )

    console.log(`[SEED-MFG] Successfully seeded Manufacturing orders, issues, receipts & ledgers into ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-MFG] Error seeding data into ${dbPath}:`, err)
  } finally {
    db.close()
  }
}
