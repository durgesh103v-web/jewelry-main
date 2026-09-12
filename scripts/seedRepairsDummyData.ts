import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-REPAIRS] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-REPAIRS] Seeding Repair & Alteration dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const todayStr = '2026-09-12'

    // 1. Get or create customers
    const customers = db.prepare('SELECT id, name, customer_code FROM customers WHERE deleted_at IS NULL ORDER BY customer_code ASC').all() as any[]
    if (customers.length === 0) {
      console.log('[SEED-REPAIRS] No customers found, skipping.')
      continue
    }

    // 2. Ensure Karigars exist
    let karigars = db.prepare('SELECT id, name, specialization FROM karigars WHERE deleted_at IS NULL').all() as any[]
    if (karigars.length === 0) {
      const defaultKarigars = [
        { id: 'karigar_ramesh', code: 'KAR-001', name: 'Ramesh Soni (Goldsmith)', specialization: 'Gold Soldering & Resizing' },
        { id: 'karigar_suresh', code: 'KAR-002', name: 'Suresh Verma (Setter)', specialization: 'Diamond & Stone Setting' },
        { id: 'karigar_anil', code: 'KAR-003', name: 'Anil Jadhav (Polisher)', specialization: 'Buffing & Rhodium Plating' }
      ]
      for (const k of defaultKarigars) {
        db.prepare(`
          INSERT OR REPLACE INTO karigars (id, karigar_code, name, specialization, mobile, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, '9820011223', 1, ?, ?)
        `).run(k.id, k.code, k.name, k.specialization, todayStr, todayStr)
      }
      karigars = defaultKarigars
    }

    // 3. Clear existing repair jobs to have clean dummy data
    db.prepare('DELETE FROM repair_jobs').run()
    db.prepare('DELETE FROM repair_material_issues').run()
    db.prepare('DELETE FROM repair_timeline_events').run()

    const repairDummies = [
      {
        id: 'rep_001',
        repair_number: 'REP-2026-001',
        customer_id: customers[0]?.id || 'cust_1',
        ownership_type: 'CUSTOMER_OWNED',
        customer_item_description: '22K Antique Gold Bridal Choker Necklace (Soldering & Re-stringing)',
        metal_type: 'GOLD',
        purity_name: '22K',
        repair_type: 'Soldering',
        status: 'READY_FOR_DELIVERY',
        priority: 'HIGH',
        received_date: '2026-09-08',
        expected_delivery_date: '2026-09-13',
        assigned_karigar_id: karigars[0]?.id || 'karigar_ramesh',
        before_gross_weight: 48.520,
        before_net_weight: 45.200,
        before_stone_count: 14,
        before_diamond_count: 0,
        intake_condition: 'One side lock broken, requires delicate 22K solder and fresh dori thread',
        after_gross_weight: 48.650,
        after_net_weight: 45.330,
        weight_difference: 0.130,
        estimate_labour: 650,
        estimate_material: 200,
        estimate_total: 850,
        final_repair_charge: 850,
        advance_adjusted: 0,
        amount_paid: 0,
        balance_due: 850,
        qc_status: 'APPROVED',
        qc_notes: 'Soldering flawless, re-strung with pure silk gold dori thread.'
      },
      {
        id: 'rep_002',
        repair_number: 'REP-2026-002',
        customer_id: customers[1]?.id || 'cust_2',
        ownership_type: 'CUSTOMER_OWNED',
        customer_item_description: '18K White Gold Solitaire Diamond Ring (Resizing from size 12 to 14)',
        metal_type: 'GOLD',
        purity_name: '18K',
        repair_type: 'Resizing',
        status: 'IN_REPAIR',
        priority: 'NORMAL',
        received_date: '2026-09-10',
        expected_delivery_date: '2026-09-15',
        assigned_karigar_id: karigars[0]?.id || 'karigar_ramesh',
        before_gross_weight: 4.850,
        before_net_weight: 4.650,
        before_stone_count: 0,
        before_diamond_count: 1,
        intake_condition: 'Good condition, needs 2 sizes enlargement with 18K white gold piece insert',
        after_gross_weight: 0,
        after_net_weight: 0,
        weight_difference: 0,
        estimate_labour: 450,
        estimate_material: 350,
        estimate_total: 800,
        final_repair_charge: 800,
        advance_adjusted: 300,
        amount_paid: 300,
        balance_due: 500,
        qc_status: 'PENDING'
      },
      {
        id: 'rep_003',
        repair_number: 'REP-2026-003',
        customer_id: customers[2]?.id || 'cust_3',
        ownership_type: 'CUSTOMER_OWNED',
        customer_item_description: '22K Traditional Temple Kada with Peacock Carving (Rhodium & Gloss Buffing)',
        metal_type: 'GOLD',
        purity_name: '22K',
        repair_type: 'Polishing',
        status: 'RECEIVED',
        priority: 'URGENT',
        received_date: '2026-09-12',
        expected_delivery_date: '2026-09-14',
        assigned_karigar_id: null,
        before_gross_weight: 32.100,
        before_net_weight: 32.100,
        before_stone_count: 0,
        before_diamond_count: 0,
        intake_condition: 'Surface dull and tarnished from storage, client requested express high-gloss buffing for family function',
        after_gross_weight: 0,
        after_net_weight: 0,
        weight_difference: 0,
        estimate_labour: 350,
        estimate_material: 0,
        estimate_total: 350,
        final_repair_charge: 350,
        advance_adjusted: 0,
        amount_paid: 0,
        balance_due: 350,
        qc_status: 'PENDING'
      },
      {
        id: 'rep_004',
        repair_number: 'REP-2026-004',
        customer_id: customers[3]?.id || 'cust_4',
        ownership_type: 'CUSTOMER_OWNED',
        customer_item_description: '14K Rose Gold Diamond Tennis Bracelet (Re-prong setting & Clasp tighten)',
        metal_type: 'GOLD',
        purity_name: '14K',
        repair_type: 'Stone Replacement',
        status: 'RECEIVED_FROM_KARIGAR',
        priority: 'NORMAL',
        received_date: '2026-09-07',
        expected_delivery_date: '2026-09-14',
        assigned_karigar_id: karigars[1]?.id || 'karigar_suresh',
        before_gross_weight: 15.240,
        before_net_weight: 13.800,
        before_stone_count: 0,
        before_diamond_count: 42,
        intake_condition: 'One diamond missing from link #12, 3 prongs loose',
        after_gross_weight: 15.290,
        after_net_weight: 13.840,
        weight_difference: 0.050,
        estimate_labour: 800,
        estimate_material: 1200,
        estimate_total: 2000,
        final_repair_charge: 2000,
        advance_adjusted: 500,
        amount_paid: 500,
        balance_due: 1500,
        qc_status: 'APPROVED',
        qc_notes: '0.04ct VS-GH diamond replaced and laser prong welded securely.'
      },
      {
        id: 'rep_005',
        repair_number: 'REP-2026-005',
        customer_id: customers[4]?.id || 'cust_5',
        ownership_type: 'CUSTOMER_OWNED',
        customer_item_description: '22K Gold Traditional Mangalsutra (Hook Replacement & Knotting)',
        metal_type: 'GOLD',
        purity_name: '22K',
        repair_type: 'Alteration',
        status: 'DELIVERED',
        priority: 'NORMAL',
        received_date: '2026-09-05',
        expected_delivery_date: '2026-09-10',
        assigned_karigar_id: karigars[0]?.id || 'karigar_ramesh',
        before_gross_weight: 18.600,
        before_net_weight: 14.200,
        before_stone_count: 0,
        before_diamond_count: 0,
        intake_condition: "Broken gold 'S' hook clasp, loose black beads strand",
        after_gross_weight: 18.820,
        after_net_weight: 14.420,
        weight_difference: 0.220,
        estimate_labour: 300,
        estimate_material: 150,
        estimate_total: 450,
        final_repair_charge: 450,
        advance_adjusted: 0,
        amount_paid: 450,
        balance_due: 0,
        payment_method: 'UPI',
        payment_reference: 'UPI/2026/09/REP450',
        qc_status: 'APPROVED',
        delivered_at: '2026-09-10 16:45:00',
        delivered_by: 'Staff Durgesh',
        received_by: 'Smt. Sunita Patel'
      }
    ]

    const insertJob = db.prepare(`
      INSERT INTO repair_jobs (
        id, repair_number, customer_id, ownership_type, customer_item_description,
        metal_type, purity_name, repair_type, status, priority,
        received_date, expected_delivery_date, assigned_karigar_id,
        before_gross_weight, before_net_weight, before_fine_weight, before_stone_count, before_diamond_count, intake_condition,
        after_gross_weight, after_net_weight, after_fine_weight, after_stone_count, after_diamond_count, weight_difference,
        estimate_labour, estimate_material, estimate_stone, estimate_other, estimate_tax, estimate_total, is_estimate_approved,
        final_repair_charge, advance_adjusted, amount_paid, balance_due, payment_method, payment_reference,
        qc_status, qc_notes, delivered_at, delivered_by, received_by, notes, created_by, created_at, updated_at
      ) VALUES (
        @id, @repair_number, @customer_id, @ownership_type, @customer_item_description,
        @metal_type, @purity_name, @repair_type, @status, @priority,
        @received_date, @expected_delivery_date, @assigned_karigar_id,
        @before_gross_weight, @before_net_weight, 0, @before_stone_count, @before_diamond_count, @intake_condition,
        @after_gross_weight, @after_net_weight, 0, 0, 0, @weight_difference,
        @estimate_labour, @estimate_material, 0, 0, 0, @estimate_total, 1,
        @final_repair_charge, @advance_adjusted, @amount_paid, @balance_due, @payment_method, @payment_reference,
        @qc_status, @qc_notes, @delivered_at, @delivered_by, @received_by, 'Customer repair service order', 'Admin', @received_date, @received_date
      )
    `)

    const insertTimeline = db.prepare(`
      INSERT INTO repair_timeline_events (
        id, repair_job_id, event_type, description, performed_by, created_at
      ) VALUES (?, ?, ?, ?, 'Admin', ?)
    `)

    for (const r of repairDummies) {
      insertJob.run({
        ...r,
        payment_method: (r as any).payment_method || 'CASH',
        payment_reference: (r as any).payment_reference || '',
        qc_notes: (r as any).qc_notes || '',
        delivered_at: (r as any).delivered_at || null,
        delivered_by: (r as any).delivered_by || null,
        received_by: (r as any).received_by || null
      })

      // Intake timeline event
      insertTimeline.run(
        `tl_intake_${r.id}`,
        r.id,
        'INTAKE_RECEIVED',
        `Jewellery custody received for ${r.repair_type}. Intake Wt: ${r.before_gross_weight.toFixed(3)}g`,
        r.received_date
      )

      if (r.assigned_karigar_id) {
        insertTimeline.run(
          `tl_assign_${r.id}`,
          r.id,
          'ASSIGNED_TO_KARIGAR',
          `Repair job assigned to artisan for workshop processing.`,
          r.received_date
        )
      }

      if (r.status === 'READY_FOR_DELIVERY' || r.status === 'DELIVERED') {
        insertTimeline.run(
          `tl_qc_${r.id}`,
          r.id,
          'QC_APPROVED',
          `Craftsmanship quality inspected and approved for delivery. Post Wt: ${r.after_gross_weight.toFixed(3)}g`,
          r.received_date
        )
      }

      if (r.status === 'DELIVERED') {
        insertTimeline.run(
          `tl_deliver_${r.id}`,
          r.id,
          'DELIVERED',
          `Jewellery delivered to customer. Final charge ₹${r.final_repair_charge} settled.`,
          (r as any).delivered_at || r.received_date
        )
      }
    }

    console.log(`[SEED-REPAIRS] Successfully seeded ${repairDummies.length} repair jobs into ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-REPAIRS] Error seeding data into ${dbPath}:`, err)
  } finally {
    db.close()
  }
}
