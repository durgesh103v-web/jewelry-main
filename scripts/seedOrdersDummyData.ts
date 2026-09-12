import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-ORDERS] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-ORDERS] Seeding Customer Custom Orders dummy data into: ${dbPath}`)
  const db = new Database(dbPath)

  try {
    // 1. Fetch available customers & items
    const customers = db.prepare('SELECT id, name, account_id, customer_code FROM customers WHERE deleted_at IS NULL LIMIT 5').all() as any[]
    const items = db.prepare('SELECT id, item_name, metal_type, default_tanch, default_wastage, default_labour_rate, barcode_value FROM items WHERE deleted_at IS NULL LIMIT 10').all() as any[]

    if (!customers.length || !items.length) {
      console.log('[SEED-ORDERS] No customers or items found in DB, skipping.')
      continue
    }

    const priya = customers.find((c) => c.name?.includes('Priya')) || customers[0]
    const rajesh = customers.find((c) => c.name?.includes('Rajesh')) || customers[1] || customers[0]
    const ananya = customers.find((c) => c.name?.includes('Ananya')) || customers[2] || customers[0]

    const goldNecklace = items.find((i) => i.item_name?.toLowerCase().includes('necklace')) || items[0]
    const goldBangle = items.find((i) => i.item_name?.toLowerCase().includes('bangle') || i.item_name?.toLowerCase().includes('ring')) || items[1] || items[0]
    const goldRing = items.find((i) => i.item_name?.toLowerCase().includes('ring')) || items[2] || items[0]
    const silverItem = items.find((i) => i.metal_type?.toLowerCase() === 'silver') || items[3] || items[0]

    // Clear existing dummy orders if any
    const existingIds = db.prepare(`SELECT id FROM customer_orders WHERE order_number IN ('ORD-2026-001', 'ORD-2026-002', 'ORD-2026-003', 'ORD-2026-004')`).all() as any[]
    if (existingIds.length) {
      for (const row of existingIds) {
        db.prepare(`DELETE FROM customer_order_items WHERE order_id = ?`).run(row.id)
        db.prepare(`DELETE FROM customer_orders WHERE id = ?`).run(row.id)
      }
      console.log(`[SEED-ORDERS] Cleared ${existingIds.length} existing dummy orders.`)
    }

    const todayStr = '2026-09-12'

    // Order 1: Bridal Kundan Necklace Set (IN_PROGRESS - In Workshop)
    const ord1Id = 'seed_order_001'
    db.prepare(`
      INSERT INTO customer_orders (
        id, order_number, customer_id, account_id, order_date, expected_delivery_date,
        status, metal_type, total_pcs, total_gross_weight, total_net_weight, total_fine_weight,
        total_majuri, metal_value, total_charges, discount_amount, taxable_amount,
        tax_amount, grand_total, rounded_total, advance_amount, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ord1Id, 'ORD-2026-001', priya.id, priya.account_id, '2026-09-10', '2026-09-16',
      'IN_PROGRESS', 'Gold', 2, 42.500, 41.800, 38.247,
      18810, 311410, 18810, 0, 330220,
      9907, 340127, 340127, 50000, 'Bridal Kundan Necklace Set with antique matte polish. Urgent for wedding on Sep 20.', 'Admin', todayStr, todayStr
    )

    db.prepare(`
      INSERT INTO customer_order_items (
        id, order_id, item_id, description, pcs, gross_weight, pack_weight, less_weight, add_weight,
        net_weight, fine_weight, metal_type, purity_name, tunch, wastage, hishob, gold_rate,
        metal_value, labour_rate, labour_rate_type, making_charges, taxable_amount, tax_percent, tax_amount,
        line_total, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_ord_item_001_1', ord1Id, goldNecklace.id, '22K Bridal Kundan Choker Necklace (Custom Design)', 1, 35.000, 0, 0.500, 0,
      34.500, 31.568, 'Gold', '22K', 91.5, 0, 91.5, 7450,
      257025, 450, 'GM', 15525, 272550, 3, 8177,
      280727, 1, todayStr, todayStr
    )

    db.prepare(`
      INSERT INTO customer_order_items (
        id, order_id, item_id, description, pcs, gross_weight, pack_weight, less_weight, add_weight,
        net_weight, fine_weight, metal_type, purity_name, tunch, wastage, hishob, gold_rate,
        metal_value, labour_rate, labour_rate_type, making_charges, taxable_amount, tax_percent, tax_amount,
        line_total, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_ord_item_001_2', ord1Id, goldBangle.id, '22K Matching Kundan Earrings (Pair)', 1, 7.500, 0, 0.200, 0,
      7.300, 6.679, 'Gold', '22K', 91.5, 0, 91.5, 7450,
      54385, 450, 'GM', 3285, 57670, 3, 1730,
      59400, 2, todayStr, todayStr
    )

    // Order 2: Antique Gold Kada & Ring (READY - Ready for POS Billing & Delivery)
    const ord2Id = 'seed_order_002'
    db.prepare(`
      INSERT INTO customer_orders (
        id, order_number, customer_id, account_id, order_date, expected_delivery_date,
        status, metal_type, total_pcs, total_gross_weight, total_net_weight, total_fine_weight,
        total_majuri, metal_value, total_charges, discount_amount, taxable_amount,
        tax_amount, grand_total, rounded_total, advance_amount, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ord2Id, 'ORD-2026-002', rajesh.id, rajesh.account_id, '2026-09-08', '2026-09-13',
      'READY', 'Gold', 2, 28.000, 28.000, 25.620,
      12600, 208600, 12600, 2000, 219200,
      6576, 225776, 225776, 40000, 'Handcrafted Mens Lion Face Kada (2.6 size) + Navratna Ring. Hallmarked with HUID.', 'Admin', todayStr, todayStr
    )

    db.prepare(`
      INSERT INTO customer_order_items (
        id, order_id, item_id, description, pcs, gross_weight, pack_weight, less_weight, add_weight,
        net_weight, fine_weight, metal_type, purity_name, tunch, wastage, hishob, gold_rate,
        metal_value, labour_rate, labour_rate_type, making_charges, taxable_amount, tax_percent, tax_amount,
        line_total, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_ord_item_002_1', ord2Id, goldBangle.id, '22K Mens Lion Face Solid Gold Kada', 1, 22.000, 0, 0, 0,
      22.000, 20.130, 'Gold', '22K', 91.5, 0, 91.5, 7450,
      163900, 450, 'GM', 9900, 173800, 3, 5214,
      179014, 1, todayStr, todayStr
    )

    db.prepare(`
      INSERT INTO customer_order_items (
        id, order_id, item_id, description, pcs, gross_weight, pack_weight, less_weight, add_weight,
        net_weight, fine_weight, metal_type, purity_name, tunch, wastage, hishob, gold_rate,
        metal_value, labour_rate, labour_rate_type, making_charges, taxable_amount, tax_percent, tax_amount,
        line_total, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_ord_item_002_2', ord2Id, goldRing.id, '22K Gent Ring with Ruby Stone', 1, 6.000, 0, 0, 0,
      6.000, 5.490, 'Gold', '22K', 91.5, 0, 91.5, 7450,
      44700, 450, 'GM', 2700, 47400, 3, 1422,
      48822, 2, todayStr, todayStr
    )

    // Order 3: Designer Mangalsutra (CONFIRMED - Newly Booked)
    const ord3Id = 'seed_order_003'
    db.prepare(`
      INSERT INTO customer_orders (
        id, order_number, customer_id, account_id, order_date, expected_delivery_date,
        status, metal_type, total_pcs, total_gross_weight, total_net_weight, total_fine_weight,
        total_majuri, metal_value, total_charges, discount_amount, taxable_amount,
        tax_amount, grand_total, rounded_total, advance_amount, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ord3Id, 'ORD-2026-003', ananya.id, ananya.account_id, '2026-09-12', '2026-09-20',
      'CONFIRMED', 'Gold', 1, 14.200, 13.500, 10.125,
      6750, 75431, 6750, 0, 82181,
      2465, 84646, 84646, 25000, '18K Rose Gold Diamond Mangalsutra with dual chain. Black beads spacing as per catalog sample.', 'Admin', todayStr, todayStr
    )

    db.prepare(`
      INSERT INTO customer_order_items (
        id, order_id, item_id, description, pcs, gross_weight, pack_weight, less_weight, add_weight,
        net_weight, fine_weight, metal_type, purity_name, tunch, wastage, hishob, gold_rate,
        metal_value, labour_rate, labour_rate_type, making_charges, taxable_amount, tax_percent, tax_amount,
        line_total, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_ord_item_003_1', ord3Id, goldNecklace.id, '18K Rose Gold Diamond Pendant Mangalsutra', 1, 14.200, 0, 0.700, 0,
      13.500, 10.125, 'Gold', '18K', 75.0, 0, 75.0, 5585,
      75431, 500, 'GM', 6750, 82181, 3, 2465,
      84646, 1, todayStr, todayStr
    )

    // Order 4: Silver Pooja Thali (COMPLETED - Delivered)
    const ord4Id = 'seed_order_004'
    db.prepare(`
      INSERT INTO customer_orders (
        id, order_number, customer_id, account_id, order_date, expected_delivery_date,
        status, metal_type, total_pcs, total_gross_weight, total_net_weight, total_fine_weight,
        total_majuri, metal_value, total_charges, discount_amount, taxable_amount,
        tax_amount, grand_total, rounded_total, advance_amount, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ord4Id, 'ORD-2026-004', priya.id, priya.account_id, '2026-09-02', '2026-09-08',
      'COMPLETED', 'Silver', 3, 350.000, 350.000, 323.750,
      4200, 29015, 4200, 0, 33215,
      996, 34211, 34211, 15000, '925 Sterling Silver 10-inch Pooja Thali with Gayatri Mantra engraving + 2 Silver Diyas. Delivered & Invoiced.', 'Admin', todayStr, todayStr
    )

    db.prepare(`
      INSERT INTO customer_order_items (
        id, order_id, item_id, description, pcs, gross_weight, pack_weight, less_weight, add_weight,
        net_weight, fine_weight, metal_type, purity_name, tunch, wastage, hishob, gold_rate,
        metal_value, labour_rate, labour_rate_type, making_charges, taxable_amount, tax_percent, tax_amount,
        line_total, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_ord_item_004_1', ord4Id, silverItem.id, '925 Sterling Silver Engraved Pooja Thali (10-inch)', 1, 250.000, 0, 0, 0,
      250.000, 231.250, 'Silver', '92.5', 92.5, 0, 92.5, 82.9,
      20725, 12, 'GM', 3000, 23725, 3, 712,
      24437, 1, todayStr, todayStr
    )

    db.prepare(`
      INSERT INTO customer_order_items (
        id, order_id, item_id, description, pcs, gross_weight, pack_weight, less_weight, add_weight,
        net_weight, fine_weight, metal_type, purity_name, tunch, wastage, hishob, gold_rate,
        metal_value, labour_rate, labour_rate_type, making_charges, taxable_amount, tax_percent, tax_amount,
        line_total, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'seed_ord_item_004_2', ord4Id, silverItem.id, '925 Sterling Silver Carved Diya (Pair)', 2, 100.000, 0, 0, 0,
      100.000, 92.500, 'Silver', '92.5', 92.5, 0, 92.5, 82.9,
      8290, 12, 'GM', 1200, 9490, 3, 285,
      9775, 2, todayStr, todayStr
    )

    console.log(`[SEED-ORDERS] Successfully seeded 4 realistic customer orders into ${dbPath}`)
  } catch (err) {
    console.error(`[SEED-ORDERS] Error seeding orders into ${dbPath}:`, err)
  } finally {
    db.close()
  }
}
