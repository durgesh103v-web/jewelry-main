import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SEED-DATA] Database not found at ${dbPath}, skipping.`)
    continue
  }

  console.log(`[SEED-DATA] Seeding rich Approval and Purchase dummy data into: ${dbPath}`)
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

    // 1. Ensure Account Groups exist
    let debtorGroup = db
      .prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL AND (group_name LIKE '%Debtor%' OR group_name LIKE '%Customer%') LIMIT 1`)
      .get() as any
    if (!debtorGroup) {
      debtorGroup = { id: 'grp-sundry-debtors' }
      db.prepare(`
        INSERT OR REPLACE INTO account_groups (id, group_name, group_type, description, active, created_at, updated_at)
        VALUES ('grp-sundry-debtors', 'Sundry Debtors', 'Assets', 'Customers', 1, ?, ?)
      `).run(now, now)
    }

    let creditorGroup = db
      .prepare(`SELECT id FROM account_groups WHERE deleted_at IS NULL AND (group_name LIKE '%Creditor%' OR group_name LIKE '%Supplier%') LIMIT 1`)
      .get() as any
    if (!creditorGroup) {
      creditorGroup = { id: 'grp-sundry-creditors' }
      db.prepare(`
        INSERT OR REPLACE INTO account_groups (id, group_name, group_type, description, active, created_at, updated_at)
        VALUES ('grp-sundry-creditors', 'Sundry Creditors', 'Liabilities', 'Bullion & Jewellery Suppliers', 1, ?, ?)
      `).run(now, now)
    }

    // 2. Ensure Accounts exist
    const ensureAccount = (id: string, name: string, phone: string, groupId: string) => {
      const existing = db.prepare(`SELECT id FROM accounts WHERE id = ? OR account_name = ?`).get(id, name) as any
      if (existing) return existing.id
      db.prepare(`
        INSERT INTO accounts (id, account_name, group_id, mobile_number, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, groupId, phone, now, now)
      return id
    }

    const cust1Id = ensureAccount('acc-cust-vip-1', 'Rajeshbhai Mehta (VIP)', '9825012345', debtorGroup.id)
    const cust2Id = ensureAccount('acc-cust-vip-2', 'Priyaben S. Shah', '9898023456', debtorGroup.id)
    const cust3Id = ensureAccount('acc-cust-vip-3', 'Anand Kumar Parekh', '9712034567', debtorGroup.id)

    const supp1Id = ensureAccount('acc-supp-bullion-1', 'Zaveri & Sons Bullion Mart', '9825199888', creditorGroup.id)
    const supp2Id = ensureAccount('acc-supp-ornament-2', 'Surat Diamond Craft Mfg', '9909011223', creditorGroup.id)
    const supp3Id = ensureAccount('acc-supp-silver-3', 'Rajkot Silver Ornaments Syndicate', '9824044556', creditorGroup.id)

    // 3. Ensure Item Groups exist
    const ensureItemGroup = (id: string, name: string, metal: string) => {
      const existing = db.prepare(`SELECT id FROM item_groups WHERE id = ? OR (group_name = ? AND metal_type = ?)`).get(id, name, metal) as any
      if (existing) return existing.id
      db.prepare(`
        INSERT OR REPLACE INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, metal, `${name} Ornaments`, now, now)
      return id
    }

    const goldGrpId = ensureItemGroup('grp-gold-jewellery', 'Gold Jewellery', 'Gold')
    const silverGrpId = ensureItemGroup('grp-silver-jewellery', 'Silver Jewellery', 'Silver')
    const diamondGrpId = ensureItemGroup('grp-diamond-jewellery', 'Diamond Jewellery', 'Diamond')

    // 4. Ensure Items exist with proper item_group_id
    const ensureItem = (id: string, name: string, metal: string, grpId: string, tanch: number, wastage: number, labRate: number, labType: string, barcode: string) => {
      const existing = db.prepare(`SELECT id FROM items WHERE id = ? OR item_name = ?`).get(id, name) as any
      if (existing) return existing.id
      db.prepare(`
        INSERT INTO items (id, item_group_id, item_name, metal_type, default_tanch, default_wastage, default_labour_rate, labour_rate_type, barcode_value, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(id, grpId, name, metal, tanch, wastage, labRate, labType, barcode, now, now)
      return id
    }

    const itemGoldHaarId = ensureItem('item-gold-haar-22k', '22K Antique Royal Haar Necklace', 'Gold', goldGrpId, 91.6, 2.5, 450, 'Gm', 'BC-GLD-NK-001')
    const itemGoldKadaId = ensureItem('item-gold-kada-22k', '22K Royal Filigree Kada Bangles (Pair)', 'Gold', goldGrpId, 91.6, 2.0, 380, 'Gm', 'BC-GLD-KD-002')
    const itemSilverPayalId = ensureItem('item-silver-payal-925', '92.5 Sterling Bridal Payal (Heavy Ghungroo)', 'Silver', silverGrpId, 92.5, 3.0, 45, 'Gm', 'BC-SLV-PY-101')
    const itemSilverThaliId = ensureItem('item-silver-thali-925', '92.5 Sterling Silver Puja Thali Set (6 Pcs)', 'Silver', silverGrpId, 92.5, 2.0, 35, 'Gm', 'BC-SLV-TH-102')
    const itemDiamondRingId = ensureItem('item-diamond-ring-solitaire', '18K Diamond Solitaire Engagement Ring (VVS-EF)', 'Diamond', diamondGrpId, 75.0, 4.0, 2500, 'Pcs', 'BC-DMD-RG-010')

    // =========================================================================
    // 5. SEED APPROVALS (Maal Approval / Jangad)
    // =========================================================================
    console.log('[SEED-DATA] Seeding 5 rich Approval records...')

    const approvalEntries = [
      {
        id: 'appr-demo-001',
        approvalNo: 'AP-0001',
        date: today,
        accountId: cust1Id,
        phone: '9825012345',
        metalType: 'Gold',
        narration: 'Sent on trial for daughter wedding selection (Jangad)',
        reminderDate: reminder1,
        status: 'pending',
        lines: [
          {
            id: 'appr-line-101',
            lineNo: 1,
            itemId: itemGoldHaarId,
            itemName: '22K Antique Royal Haar Necklace',
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
            itemId: itemGoldKadaId,
            itemName: '22K Royal Filigree Kada Bangles (Pair)',
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
        accountId: cust2Id,
        phone: '9898023456',
        metalType: 'Diamond',
        narration: 'Engagement selection - confirmed and converted to sale bill',
        reminderDate: yesterday,
        status: 'approved',
        lines: [
          {
            id: 'appr-line-201',
            lineNo: 1,
            itemId: itemDiamondRingId,
            itemName: '18K Diamond Solitaire Engagement Ring (VVS-EF)',
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
        accountId: cust3Id,
        phone: '9712034567',
        metalType: 'Silver',
        narration: 'Bridal Silver jewellery trial for festive family function',
        reminderDate: today,
        status: 'partial_return',
        lines: [
          {
            id: 'appr-line-301',
            lineNo: 1,
            itemId: itemSilverPayalId,
            itemName: '92.5 Sterling Bridal Payal (Heavy Ghungroo)',
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
            itemId: itemSilverThaliId,
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
        accountId: cust2Id,
        phone: '9898023456',
        metalType: 'Gold',
        narration: 'Office colleague gifts selection (Pending return or payment by Friday)',
        reminderDate: reminder2,
        status: 'pending',
        lines: [
          {
            id: 'appr-line-401',
            lineNo: 1,
            itemId: itemGoldKadaId,
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
        accountId: cust1Id,
        phone: '9825012345',
        metalType: 'Gold',
        narration: 'Trial ornaments brought back in full without sale',
        reminderDate: yesterday,
        status: 'returned',
        returnedAt: yesterday + ' 16:30:00',
        lines: [
          {
            id: 'appr-line-501',
            lineNo: 1,
            itemId: itemGoldHaarId,
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

    const insertApprHeader = db.prepare(`
      INSERT OR REPLACE INTO approval_headers (
        id, approval_no, approval_date, account_id, phone, metal_type,
        narration, reminder_date, item_fine_total, item_majuri_total,
        status, converted_sale_id, converted_at, returned_at,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `)

    const insertApprLine = db.prepare(`
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

        insertApprHeader.run(
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
          insertApprLine.run(
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

    // =========================================================================
    // 6. SEED PURCHASES (Wholesale Bullion & Ornament Inward)
    // =========================================================================
    console.log('[SEED-DATA] Seeding 3 rich Purchase records...')

    const purchaseEntries = [
      {
        id: 'purch-demo-001',
        purchaseNo: 'PU-0001',
        purchaseDate: yesterday,
        accountId: supp1Id,
        phone: '9825199888',
        metalType: 'Gold',
        haste: 'Mukeshbhai Bullion Courier',
        dpNo: 'INV-ZAV-8841',
        narration: 'Bullion 999 100g Bar purchase for showroom casting stock',
        reminderDate: reminder1,
        oldGoldFine: 125.400,
        itemFineTotal: 99.900,
        itemMajuriTotal: 1500.00,
        paymentFineNaveTotal: 50.000,
        paymentCashNaveTotal: 1500.00,
        paymentBankNaveTotal: 0,
        paymentAnamatNaveTotal: 0,
        closingGoldFine: 175.300,
        closingSilverFine: 0,
        closingCash: 0,
        closingBank: 0,
        closingAnamat: 0,
        lines: [
          {
            id: 'purch-line-101',
            lineNo: 1,
            itemId: itemGoldHaarId,
            itemName: '24K Standard 999 Fine Gold Bullion Bar (100g)',
            barcode: 'BC-BAR-GLD-100',
            remark: 'Refinery Mint Serial #MMTC-987211',
            pcs: 1,
            grossWeight: 100.000,
            packWeight: 0,
            lessWeight: 0,
            addWeight: 0,
            netWeight: 100.000,
            tunch: 99.9,
            wastage: 0,
            hishob: 99.9,
            labourRate: 15,
            labourRateType: 'Gm',
            fine: 99.900,
            majuri: 1500.00
          }
        ],
        payments: [
          {
            id: 'purch-pay-101',
            lineNo: 1,
            type: 'FINE NAVE',
            details: 'RTGS Fine Transfer via Bullion Clearing',
            pcs: 0,
            weight: 50.000,
            tanch: 100.0,
            wastage: 0,
            hishob: 100.0,
            fine: 50.000,
            rate: 0,
            fineAmount: 0,
            anamat: 0,
            cash: 0,
            bank: 0
          },
          {
            id: 'purch-pay-102',
            lineNo: 2,
            type: 'CASH NAVE',
            details: 'Making charges cash settlement',
            pcs: 0,
            weight: 0,
            tanch: 0,
            wastage: 0,
            hishob: 0,
            fine: 0,
            rate: 0,
            fineAmount: 0,
            anamat: 0,
            cash: 1500.00,
            bank: 0
          }
        ]
      },
      {
        id: 'purch-demo-002',
        purchaseNo: 'PU-0002',
        purchaseDate: twoDaysAgo,
        accountId: supp2Id,
        phone: '9909011223',
        metalType: 'Diamond',
        haste: 'Speed Post Secure Parcel',
        dpNo: 'INV-SRT-5120',
        narration: '18K Diamond Jewellery Inward - Exhibition Collection',
        reminderDate: reminder2,
        oldGoldFine: 0,
        itemFineTotal: 18.250,
        itemMajuriTotal: 28500.00,
        paymentFineNaveTotal: 0,
        paymentCashNaveTotal: 0,
        paymentBankNaveTotal: 28500.00,
        paymentAnamatNaveTotal: 0,
        closingGoldFine: -18.250,
        closingSilverFine: 0,
        closingCash: 0,
        closingBank: 0,
        closingAnamat: 0,
        lines: [
          {
            id: 'purch-line-201',
            lineNo: 1,
            itemId: itemDiamondRingId,
            itemName: '18K Diamond Solitaire Engagement Ring (VVS-EF)',
            barcode: 'BC-DMD-RG-010',
            remark: 'Certified Lots 5 Pcs Inward',
            pcs: 5,
            grossWeight: 26.500,
            packWeight: 0,
            lessWeight: 2.160,
            addWeight: 0,
            netWeight: 24.340,
            tunch: 75.0,
            wastage: 0,
            hishob: 75.0,
            labourRate: 5700,
            labourRateType: 'Pcs',
            fine: 18.255,
            majuri: 28500.00
          }
        ],
        payments: [
          {
            id: 'purch-pay-201',
            lineNo: 1,
            type: 'BANK NAVE',
            details: 'HDFC Bank NEFT #N8829104',
            pcs: 0,
            weight: 0,
            tanch: 0,
            wastage: 0,
            hishob: 0,
            fine: 0,
            rate: 0,
            fineAmount: 0,
            anamat: 0,
            cash: 0,
            bank: 28500.00
          }
        ]
      },
      {
        id: 'purch-demo-003',
        purchaseNo: 'PU-0003',
        purchaseDate: today,
        accountId: supp3Id,
        phone: '9824044556',
        metalType: 'Silver',
        haste: 'Rajkot Angadia Express',
        dpNo: 'INV-RJK-3301',
        narration: 'Silver Jewellery Consignment Inward 5 Kgs',
        reminderDate: reminder1,
        oldGoldFine: 0,
        itemFineTotal: 4625.000,
        itemMajuriTotal: 17500.00,
        paymentFineNaveTotal: 2000.000,
        paymentCashNaveTotal: 0,
        paymentBankNaveTotal: 17500.00,
        paymentAnamatNaveTotal: 0,
        closingGoldFine: 0,
        closingSilverFine: -2625.000,
        closingCash: 0,
        closingBank: 0,
        closingAnamat: 0,
        lines: [
          {
            id: 'purch-line-301',
            lineNo: 1,
            itemId: itemSilverPayalId,
            itemName: '92.5 Sterling Bridal Payal (Heavy Ghungroo)',
            barcode: 'BC-SLV-PY-101',
            remark: 'Rajkot Ghungroo Master Lot 50 Pairs',
            pcs: 50,
            grossWeight: 5000.000,
            packWeight: 0,
            lessWeight: 0,
            addWeight: 0,
            netWeight: 5000.000,
            tunch: 92.5,
            wastage: 0,
            hishob: 92.5,
            labourRate: 3.5,
            labourRateType: 'Gm',
            fine: 4625.000,
            majuri: 17500.00
          }
        ],
        payments: []
      }
    ]

    const insertPurchHeader = db.prepare(`
      INSERT OR REPLACE INTO purchase_headers (
        id, purchase_no, purchase_date, account_id, phone, metal_type,
        haste, dp_no, narration, reminder_date, old_gold_fine, old_silver_fine,
        old_cash, old_anamat, old_bank, item_fine_total, item_majuri_total,
        payment_fine_nave_total, payment_cash_nave_total, payment_bank_nave_total,
        payment_anamat_nave_total, closing_gold_fine, closing_silver_fine,
        closing_cash, closing_anamat, closing_bank, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `)

    const insertPurchLine = db.prepare(`
      INSERT OR REPLACE INTO purchase_item_lines (
        id, purchase_id, line_no, line_type, item_id, stamp_id, design_id,
        item_name_snapshot, barcode, remark, pcs, gross_weight, pack_weight,
        less_weight, add_weight, net_weight, tunch, wastage, hishob, unit,
        labour_rate, labour_rate_type, fine, majuri, created_at, updated_at
      ) VALUES (?, ?, ?, 'JAMA', ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GM', ?, ?, ?, ?, ?, ?)
    `)

    const insertPurchPayment = db.prepare(`
      INSERT OR REPLACE INTO purchase_payment_lines (
        id, purchase_id, line_no, type, jama_nave, details, pcs, weight,
        tanch, wastage, hishob, fine, rate, fine_amount, anamat, cash, bank,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'NAVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    db.transaction(() => {
      for (const entry of purchaseEntries) {
        insertPurchHeader.run(
          entry.id,
          entry.purchaseNo,
          entry.purchaseDate,
          entry.accountId,
          entry.phone,
          entry.metalType,
          entry.haste,
          entry.dpNo,
          entry.narration,
          entry.reminderDate,
          entry.oldGoldFine,
          0,
          0,
          0,
          0,
          entry.itemFineTotal,
          entry.itemMajuriTotal,
          entry.paymentFineNaveTotal,
          entry.paymentCashNaveTotal,
          entry.paymentBankNaveTotal,
          entry.paymentAnamatNaveTotal,
          entry.closingGoldFine,
          entry.closingSilverFine,
          entry.closingCash,
          entry.closingAnamat,
          entry.closingBank,
          now,
          now
        )

        for (const line of entry.lines) {
          insertPurchLine.run(
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
            now,
            now
          )
        }

        for (const pay of entry.payments) {
          insertPurchPayment.run(
            pay.id,
            entry.id,
            pay.lineNo,
            pay.type,
            pay.details,
            pay.pcs,
            pay.weight,
            pay.tanch,
            pay.wastage,
            pay.hishob,
            pay.fine,
            pay.rate,
            pay.fineAmount,
            pay.anamat,
            pay.cash,
            pay.bank,
            now,
            now
          )
        }
      }
    })()

    console.log(`[SEED-DATA] Successfully seeded Approvals & Purchases into ${dbPath}!`)
  } catch (err) {
    console.error(`[SEED-DATA] Error seeding data into ${dbPath}:`, err)
  } finally {
    db.close()
  }
}
