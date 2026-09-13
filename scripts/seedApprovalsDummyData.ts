import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-APPROVALS] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-APPROVALS] Seeding Approval (Maal Approval) dummy data into: ${dbPath}`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF')

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().slice(0, 10)
    const reminder1 = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
    const reminder2 = new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Ensure at least 3 customer accounts exist
    const accounts = db.prepare(`SELECT id, account_name, mobile_number FROM accounts WHERE deleted_at IS NULL LIMIT 5`).all() as Array<{
      id: string
      account_name: string
      mobile_number: string
    }>

    let customer1 = accounts[0]
    let customer2 = accounts[1]
    let customer3 = accounts[2]

    if (!customer1) {
      customer1 = { id: 'acc-cust-vip-1', account_name: 'Rajeshbhai Mehta (VIP)', mobile_number: '9825012345' }
      db.prepare(`
        INSERT OR REPLACE INTO accounts (id, account_name, mobile_number, active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(customer1.id, customer1.account_name, customer1.mobile_number, now, now)
    }

    if (!customer2) {
      customer2 = { id: 'acc-cust-vip-2', account_name: 'Priyaben S. Shah', mobile_number: '9898023456' }
      db.prepare(`
        INSERT OR REPLACE INTO accounts (id, account_name, mobile_number, active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(customer2.id, customer2.account_name, customer2.mobile_number, now, now)
    }

    if (!customer3) {
      customer3 = { id: 'acc-cust-vip-3', account_name: 'Anand Kumar Parekh', mobile_number: '9712034567' }
      db.prepare(`
        INSERT OR REPLACE INTO accounts (id, account_name, mobile_number, active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(customer3.id, customer3.account_name, customer3.mobile_number, now, now)
    }

    // 2. Ensure Items exist
    const existingItems = db.prepare(`SELECT id, item_name, metal_type FROM items WHERE deleted_at IS NULL LIMIT 10`).all() as Array<{
      id: string
      item_name: string
      metal_type: string
    }>

    let itemGold1 = existingItems.find((i) => i.metal_type === 'Gold')
    let itemGold2 = existingItems.find((i) => i.metal_type === 'Gold' && i.id !== itemGold1?.id)
    let itemSilver1 = existingItems.find((i) => i.metal_type === 'Silver')
    let itemDiamond1 = existingItems.find((i) => i.metal_type === 'Diamond' || i.item_name.includes('Diamond'))

    if (!itemGold1) {
      itemGold1 = { id: 'item-gold-necklace-22k', item_name: '22K Antique Royal Haar Necklace', metal_type: 'Gold' }
      db.prepare(`
        INSERT OR REPLACE INTO items (id, item_name, metal_type, active, default_tanch, default_wastage, default_labour_rate, labour_rate_type, created_at, updated_at)
        VALUES (?, ?, 'Gold', 1, 91.6, 2.5, 450, 'Gm', ?, ?)
      `).run(itemGold1.id, itemGold1.item_name, now, now)
    }

    if (!itemGold2) {
      itemGold2 = { id: 'item-gold-kada-22k', item_name: '22K Royal Filigree Kada Bangles (Pair)', metal_type: 'Gold' }
      db.prepare(`
        INSERT OR REPLACE INTO items (id, item_name, metal_type, active, default_tanch, default_wastage, default_labour_rate, labour_rate_type, created_at, updated_at)
        VALUES (?, ?, 'Gold', 1, 91.6, 2.0, 380, 'Gm', ?, ?)
      `).run(itemGold2.id, itemGold2.item_name, now, now)
    }

    if (!itemSilver1) {
      itemSilver1 = { id: 'item-silver-payal-925', item_name: '92.5 Sterling Bridal Payal (Heavy Ghungroo)', metal_type: 'Silver' }
      db.prepare(`
        INSERT OR REPLACE INTO items (id, item_name, metal_type, active, default_tanch, default_wastage, default_labour_rate, labour_rate_type, created_at, updated_at)
        VALUES (?, ?, 'Silver', 1, 92.5, 3.0, 45, 'Gm', ?, ?)
      `).run(itemSilver1.id, itemSilver1.item_name, now, now)
    }

    if (!itemDiamond1) {
      itemDiamond1 = { id: 'item-diamond-ring-solitaire', item_name: '18K Diamond Solitaire Engagement Ring (VVS-EF)', metal_type: 'Diamond' }
      db.prepare(`
        INSERT OR REPLACE INTO items (id, item_name, metal_type, active, default_tanch, default_wastage, default_labour_rate, labour_rate_type, created_at, updated_at)
        VALUES (?, ?, 'Diamond', 1, 75.0, 4.0, 1200, 'Pcs', ?, ?)
      `).run(itemDiamond1.id, itemDiamond1.item_name, now, now)
    }

    // 3. Clear existing demo approvals if needed or ensure clean upsert
    console.log('[SEED-APPROVALS] Inserting sample Approval transactions across all statuses...')

    const approvalEntries = [
      {
        id: 'appr-demo-001',
        approvalNo: 'AP-0001',
        date: today,
        accountId: customer1.id,
        phone: customer1.mobile_number,
        metalType: 'Gold',
        narration: 'Sent on trial for daughter wedding selection (Jangad)',
        reminderDate: reminder1,
        status: 'pending',
        lines: [
          {
            id: 'appr-line-101',
            lineNo: 1,
            itemId: itemGold1.id,
            itemName: itemGold1.item_name,
            barcode: 'BC-GLD-NK-001',
            remark: 'Antique Polish with Meenakari matching earring set',
            pcs: 1,
            grossWeight: 45.850,
            packWeight: 0,
            lessWeight: 0.500,
            addWeight: 0,
            netWeight: 45.350,
            tunch: 91.6,
            wastage: 2.5,
            hishob: 94.1,
            labourRate: 450,
            labourRateType: 'Gm',
            fine: 42.674,
            majuri: 20407.50,
            returnStatus: 'pending'
          },
          {
            id: 'appr-line-102',
            lineNo: 2,
            itemId: itemGold2.id,
            itemName: itemGold2.item_name,
            barcode: 'BC-GLD-KD-002',
            remark: 'Size 2.6 pair - trial with lehenga match',
            pcs: 2,
            grossWeight: 52.300,
            packWeight: 0,
            lessWeight: 0.200,
            addWeight: 0,
            netWeight: 52.100,
            tunch: 91.6,
            wastage: 2.0,
            hishob: 93.6,
            labourRate: 380,
            labourRateType: 'Gm',
            fine: 48.765,
            majuri: 19798.00,
            returnStatus: 'pending'
          }
        ]
      },
      {
        id: 'appr-demo-002',
        approvalNo: 'AP-0002',
        date: threeDaysAgo,
        accountId: customer2.id,
        phone: customer2.mobile_number,
        metalType: 'Diamond',
        narration: 'Engagement selection - confirmed and converted to sale bill',
        reminderDate: yesterday,
        status: 'approved',
        lines: [
          {
            id: 'appr-line-201',
            lineNo: 1,
            itemId: itemDiamond1.id,
            itemName: itemDiamond1.item_name,
            barcode: 'BC-DMD-RG-010',
            remark: 'Certified IGI Certificate enclosed with velvet box',
            pcs: 1,
            grossWeight: 5.450,
            packWeight: 0,
            lessWeight: 0.850,
            addWeight: 0,
            netWeight: 4.600,
            tunch: 75.0,
            wastage: 4.0,
            hishob: 79.0,
            labourRate: 2500,
            labourRateType: 'Pcs',
            fine: 3.634,
            majuri: 2500.00,
            returnStatus: 'pending'
          }
        ]
      },
      {
        id: 'appr-demo-003',
        approvalNo: 'AP-0003',
        date: twoDaysAgo,
        accountId: customer3.id,
        phone: customer3.mobile_number,
        metalType: 'Silver',
        narration: 'Bridal Silver jewellery trial for festive family function',
        reminderDate: today,
        status: 'partial_return',
        lines: [
          {
            id: 'appr-line-301',
            lineNo: 1,
            itemId: itemSilver1.id,
            itemName: itemSilver1.item_name,
            barcode: 'BC-SLV-PY-101',
            remark: 'Traditional Kolhapuri Ghungroo Pattern - Kept by customer',
            pcs: 1,
            grossWeight: 145.200,
            packWeight: 0,
            lessWeight: 2.000,
            addWeight: 0,
            netWeight: 143.200,
            tunch: 92.5,
            wastage: 3.0,
            hishob: 95.5,
            labourRate: 45,
            labourRateType: 'Gm',
            fine: 136.756,
            majuri: 6444.00,
            returnStatus: 'pending'
          },
          {
            id: 'appr-line-302',
            lineNo: 2,
            itemId: itemSilver1.id,
            itemName: '92.5 Sterling Silver Puja Thali Set (6 Pcs)',
            barcode: 'BC-SLV-TH-102',
            remark: 'Returned on inspection - size was too large for mandir altar',
            pcs: 1,
            grossWeight: 280.000,
            packWeight: 0,
            lessWeight: 0,
            addWeight: 0,
            netWeight: 280.000,
            tunch: 92.5,
            wastage: 2.0,
            hishob: 94.5,
            labourRate: 35,
            labourRateType: 'Gm',
            fine: 264.600,
            majuri: 9800.00,
            returnStatus: 'returned'
          }
        ]
      },
      {
        id: 'appr-demo-004',
        approvalNo: 'AP-0004',
        date: yesterday,
        accountId: customer2.id,
        phone: customer2.mobile_number,
        metalType: 'Gold',
        narration: 'Office colleague gifts selection (Pending return or payment by Friday)',
        reminderDate: reminder2,
        status: 'pending',
        lines: [
          {
            id: 'appr-line-401',
            lineNo: 1,
            itemId: itemGold2.id,
            itemName: '22K Gold Light Weight Choker Necklace',
            barcode: 'BC-GLD-CK-008',
            remark: 'Yellow Gold with Rhodium Highlights',
            pcs: 1,
            grossWeight: 28.400,
            packWeight: 0,
            lessWeight: 0.100,
            addWeight: 0,
            netWeight: 28.300,
            tunch: 91.6,
            wastage: 2.2,
            hishob: 93.8,
            labourRate: 420,
            labourRateType: 'Gm',
            fine: 26.545,
            majuri: 11886.00,
            returnStatus: 'pending'
          }
        ]
      },
      {
        id: 'appr-demo-005',
        approvalNo: 'AP-0005',
        date: threeDaysAgo,
        accountId: customer1.id,
        phone: customer1.mobile_number,
        metalType: 'Gold',
        narration: 'Trial ornaments brought back in full without sale',
        reminderDate: yesterday,
        status: 'returned',
        returnedAt: yesterday + ' 16:30:00',
        lines: [
          {
            id: 'appr-line-501',
            lineNo: 1,
            itemId: itemGold1.id,
            itemName: '22K Temple Design Bridal Jhumka Earrings',
            barcode: 'BC-GLD-JM-015',
            remark: 'Customer selected another heavier pair from showroom floor',
            pcs: 2,
            grossWeight: 18.600,
            packWeight: 0,
            lessWeight: 0.200,
            addWeight: 0,
            netWeight: 18.400,
            tunch: 91.6,
            wastage: 2.5,
            hishob: 94.1,
            labourRate: 480,
            labourRateType: 'Gm',
            fine: 17.314,
            majuri: 8832.00,
            returnStatus: 'returned'
          }
        ]
      }
    ]

    const insertHeader = db.prepare(`
      INSERT OR REPLACE INTO approval_headers (
        id, approval_no, approval_date, account_id, phone, metal_type,
        narration, reminder_date, item_fine_total, item_majuri_total,
        status, converted_sale_id, converted_at, returned_at,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `)

    const insertLine = db.prepare(`
      INSERT OR REPLACE INTO approval_item_lines (
        id, approval_id, line_no, item_id, stamp_id, design_id,
        item_name_snapshot, barcode, remark, pcs, gross_weight,
        pack_weight, less_weight, add_weight, net_weight, tunch,
        wastage, hishob, unit, labour_rate, labour_rate_type,
        fine, majuri, return_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GM', ?, ?, ?, ?, ?, ?, ?)
    `)

    db.transaction(() => {
      for (const entry of approvalEntries) {
        const itemFineTotal = entry.lines.reduce((acc, l) => acc + l.fine, 0)
        const itemMajuriTotal = entry.lines.reduce((acc, l) => acc + l.majuri, 0)

        insertHeader.run(
          entry.id,
          entry.approvalNo,
          entry.date,
          entry.accountId,
          entry.phone,
          entry.metalType,
          entry.narration,
          entry.reminderDate,
          itemFineTotal,
          itemMajuriTotal,
          entry.status,
          entry.status === 'approved' ? 'sale-dummy-conv-01' : null,
          entry.status === 'approved' ? yesterday + ' 14:00:00' : null,
          (entry as any).returnedAt || null,
          now,
          now
        )

        for (const line of entry.lines) {
          insertLine.run(
            line.id,
            entry.id,
            line.lineNo,
            line.itemId,
            line.itemName,
            line.barcode,
            line.remark,
            line.pcs,
            line.grossWeight,
            line.packWeight,
            line.lessWeight,
            line.addWeight,
            line.netWeight,
            line.tunch,
            line.wastage,
            line.hishob,
            line.labourRate,
            line.labourRateType,
            line.fine,
            line.majuri,
            line.returnStatus,
            now,
            now
          )
        }
      }
    })()

    console.log(`[SEED-APPROVALS] Successfully seeded 5 rich Approval records (Pending: 2, Approved: 1, Partial Return: 1, Returned: 1).`)
  } catch (err) {
    console.error(`[SEED-APPROVALS] Error seeding approvals:`, err)
  } finally {
    db.close()
  }
}
