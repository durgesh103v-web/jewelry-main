import { app } from 'electron'
import { getDatabase } from '../database/connection'
import { migration018 } from '../database/migrations/018_vendor_consignment_and_memo'
import { consignmentService } from '../services/consignment.service'
import { salesInvoiceService } from '../services/salesInvoice.service'
import { returnTransactionService } from '../services/returnTransaction.service'
import { ConsignmentRepository } from '../database/repositories/ConsignmentRepository'
import { JewelleryStockItemRepository } from '../database/repositories/JewelleryStockItemRepository'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'

export async function runConsignmentTests() {
  console.log('=== RUNNING CONSIGNMENT & SETTLEMENT HARDENING BACKEND TESTS ===')
  const db = getDatabase()
  
  // Ensure migration 018 is applied
  try {
    migration018.up(db)
  } catch (e: any) {
    // If tables already exist, ignore
  }

  const stockItemRepo = new JewelleryStockItemRepository()
  const consignmentRepo = new ConsignmentRepository()

  // Ensure test supplier and account
  let supplierAccount = db.prepare(`SELECT * FROM accounts WHERE name = 'Hardened Test Supplier Account'`).get() as any
  if (!supplierAccount) {
    const accId = uuidv4()
    db.prepare(`
      INSERT INTO accounts (id, name, group_id, opening_cash, opening_gold_fine, opening_silver_fine, created_at, updated_at)
      VALUES (?, 'Hardened Test Supplier Account', (SELECT id FROM account_groups LIMIT 1), 0, 0, 0, datetime('now'), datetime('now'))
    `).run(accId)
    supplierAccount = { id: accId }
  }

  let supplier = db.prepare(`SELECT * FROM suppliers WHERE name = 'Hardened Wholesaler'`).get() as any
  if (!supplier) {
    const suppId = uuidv4()
    db.prepare(`
      INSERT INTO suppliers (id, name, phone, account_id, created_at, updated_at)
      VALUES (?, 'Hardened Wholesaler', '9876543210', ?, datetime('now'), datetime('now'))
    `).run(suppId, supplierAccount.id)
    supplier = { id: suppId, name: 'Hardened Wholesaler', account_id: supplierAccount.id }
  }

  // Ensure test item
  let item = db.prepare(`SELECT * FROM items WHERE item_name = 'Diamond Bracelet 18K'`).get() as any
  if (!item) {
    const itemId = uuidv4()
    db.prepare(`
      INSERT INTO items (id, item_name, item_code, metal_type, default_tanch, default_labour_rate, active, created_at, updated_at)
      VALUES (?, 'Diamond Bracelet 18K', 'DB-18K', 'Gold', 75, 500, 1, datetime('now'), datetime('now'))
    `).run(itemId)
    item = { id: itemId, item_name: 'Diamond Bracelet 18K', metal_type: 'Gold' }
  }

  let customer = db.prepare(`SELECT * FROM customers LIMIT 1`).get() as any
  if (!customer) {
    const cId = uuidv4()
    const cAccId = uuidv4()
    db.prepare(`
      INSERT INTO accounts (id, name, group_id, opening_cash, opening_gold_fine, opening_silver_fine, created_at, updated_at)
      VALUES (?, 'Hardened Customer Account', (SELECT id FROM account_groups LIMIT 1), 0, 0, 0, datetime('now'), datetime('now'))
    `).run(cAccId)
    db.prepare(`
      INSERT INTO customers (id, name, mobile, account_id, created_at, updated_at)
      VALUES (?, 'Hardened Test Customer', '9998887776', ?, datetime('now'), datetime('now'))
    `).run(cId, cAccId)
    customer = { id: cId, name: 'Hardened Test Customer', account_id: cAccId }
  }

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`)
      passed++
    } else {
      console.error(`[FAIL] ${testName}`)
      failed++
    }
  }

  // --- Test 1: Inward Intake (4 pieces @ ₹50,000 each = ₹200,000 total vendor cost) ---
  console.log('\n--- Test 1: Inward Intake ---')
  const inward1 = consignmentService.createInward({
    supplierId: supplier.id,
    inwardDate: dayjs().format('YYYY-MM-DD'),
    expectedReturnDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    notes: 'Exhibition consignment items',
    items: Array.from({ length: 4 }, (_, i) => ({
      itemId: item.id,
      vendorItemCode: `BRAC-00${i + 1}`,
      grossWeight: 20.0,
      netWeight: 18.0,
      fineWeight: 13.5,
      purityName: '18K',
      tunch: 75,
      vendorCost: 50000,
      retailPrice: 75000,
      counter: 'Counter 1',
      tray: 'Tray A'
    }))
  })

  let fInward = consignmentService.getInwardById(inward1.id)
  assert(fInward !== null, 'Inward created')
  assert(fInward?.status === 'ACTIVE', 'Inward status is ACTIVE')
  assert(fInward?.settlementStatus === 'UNSETTLED', 'Settlement status starts as UNSETTLED')

  // --- Test 2: Sell 2 pieces at POS (Vendor liability recognized = ₹100,000) ---
  console.log('\n--- Test 2: POS Sale of 2 Pieces ---')
  const barcode0 = fInward?.items?.[0].barcode!
  const barcode1 = fInward?.items?.[1].barcode!

  const sale1 = salesInvoiceService.createInvoice({
    customerId: customer.id,
    accountId: customer.account_id || customer.accountId,
    invoiceDate: dayjs().format('YYYY-MM-DD'),
    metalType: 'Gold',
    items: [
      {
        itemId: item.id,
        description: 'Diamond Bracelet (Consignment 1)',
        barcode: barcode0,
        pcs: 1,
        grossWeight: 20.0,
        lessWeight: 2.0,
        goldRate: 6500,
        labourRate: 500,
        discountAmount: 0
      },
      {
        itemId: item.id,
        description: 'Diamond Bracelet (Consignment 2)',
        barcode: barcode1,
        pcs: 1,
        grossWeight: 20.0,
        lessWeight: 2.0,
        goldRate: 6500,
        labourRate: 500,
        discountAmount: 0
      }
    ],
    payments: [{ paymentMethod: 'CASH', amount: 200000 }]
  })
  assert(sale1 !== null && !!sale1.id, 'Sale 1 invoice generated successfully')

  fInward = consignmentService.getInwardById(inward1.id)
  assert(fInward?.totalSoldVendorCost === 100000, 'Total sold vendor cost is ₹100,000')
  assert(fInward?.outstandingLiability === 100000, 'Outstanding vendor liability is ₹100,000')

  // --- Test B: Partial Vendor Settlement (₹60,000 of ₹100,000) ---
  console.log('\n--- Test B: Partial Vendor Settlement ---')
  const partialSettlement = consignmentService.settleConsignment({
    consignmentInwardId: inward1.id,
    amount: 60000,
    paymentMethod: 'BANK',
    paymentReference: 'NEFT-889977',
    notes: 'Partial settlement for 2 sold bracelets'
  })

  assert(partialSettlement.settlementNumber.startsWith('SET'), 'Settlement document number starts with SET')
  fInward = consignmentService.getInwardById(inward1.id)
  assert(fInward?.totalSettledAmount === 60000, 'Total settled amount updated to ₹60,000')
  assert(fInward?.outstandingLiability === 40000, 'Remaining outstanding liability is ₹40,000')
  assert(fInward?.settlementStatus === 'PARTIALLY_SETTLED', 'Settlement status transitioned to PARTIALLY_SETTLED')

  // --- Test C: Overpayment Rejection ---
  console.log('\n--- Test C: Overpayment Protection ---')
  let overpayRejected = false
  try {
    consignmentService.settleConsignment({
      consignmentInwardId: inward1.id,
      amount: 50000, // Remaining is 40,000; 50,000 must be rejected
      paymentMethod: 'CASH'
    })
  } catch (err: any) {
    overpayRejected = true
  }
  assert(overpayRejected, 'Overpayment rejected when amount > outstanding liability')

  // --- Test A: Full Vendor Settlement (Remaining ₹40,000) ---
  console.log('\n--- Test A: Full Vendor Settlement ---')
  const finalSettlement = consignmentService.settleConsignment({
    consignmentInwardId: inward1.id,
    amount: 40000,
    paymentMethod: 'CASH',
    notes: 'Final settlement for the 2 sold bracelets'
  })
  assert(finalSettlement !== null && !!finalSettlement.settlementId, 'Final settlement created')

  fInward = consignmentService.getInwardById(inward1.id)
  assert(fInward?.totalSettledAmount === 100000, 'Total settled amount is ₹100,000')
  assert(fInward?.outstandingLiability === 0, 'Remaining outstanding liability is ₹0')
  assert(fInward?.settlementStatus === 'SETTLED', 'Settlement status transitioned to SETTLED')

  // --- Test D: Duplicate Settlement Rejection ---
  console.log('\n--- Test D: Duplicate Settlement Rejection ---')
  let duplicateRejected = false
  try {
    consignmentService.settleConsignment({
      consignmentInwardId: inward1.id,
      amount: 10000,
      paymentMethod: 'CASH'
    })
  } catch (err: any) {
    duplicateRejected = true
  }
  assert(duplicateRejected, 'Duplicate settlement rejected when outstanding liability is 0')

  // --- Test H: Sold Item Cannot Be Vendor-Returned ---
  console.log('\n--- Test H: Block Vendor Return for Sold Item ---')
  let returnSoldBlocked = false
  const soldCItemId = fInward?.items?.[0].id!
  try {
    consignmentService.returnToVendor({
      consignmentInwardId: inward1.id,
      consignmentItemIds: [soldCItemId],
      returnDate: dayjs().format('YYYY-MM-DD')
    })
  } catch (err: any) {
    returnSoldBlocked = true
  }
  assert(returnSoldBlocked, 'Vendor return of SOLD piece correctly blocked')

  // --- Test I & J: Supplier Ledger & Accounting Reconciliation ---
  console.log('\n--- Test I & J: Supplier & Accounting Ledger Reconciliation ---')
  const supplierEntries = db
    .prepare(
      `SELECT * FROM account_ledger WHERE account_id = ? AND source_type IN ('CONSIGNMENT_SALE', 'CONSIGNMENT_SETTLEMENT')`
    )
    .all(supplier.account_id) as any[]

  const totalJama = supplierEntries.reduce((sum, e) => sum + (e.cash_jama || 0), 0)
  const totalNave = supplierEntries.reduce((sum, e) => sum + (e.cash_nave || 0) + (e.bank_nave || 0), 0)
  assert(totalJama >= 100000, 'Supplier liability credited to account ledger')
  assert(totalNave >= 100000, 'Supplier payments debited to account ledger')
  assert(totalJama === totalNave, 'Supplier ledger entries for this consignment are fully balanced (Jama == Nave)')

  // --- Test F: Customer Return Before Vendor Settlement ---
  console.log('\n--- Test F: Customer Return Before Vendor Settlement ---')
  // Create Inward 2, sell 1 item, return by customer before settling
  const inward2 = consignmentService.createInward({
    supplierId: supplier.id,
    inwardDate: dayjs().format('YYYY-MM-DD'),
    items: [
      {
        itemId: item.id,
        grossWeight: 15.0,
        netWeight: 14.0,
        fineWeight: 10.5,
        vendorCost: 45000,
        retailPrice: 60000
      }
    ]
  })

  const fInward2 = consignmentService.getInwardById(inward2.id)
  const barcodeInw2 = fInward2?.items?.[0].barcode!
  const stockItemInw2 = stockItemRepo.findByIdentifier(barcodeInw2)!

  const sale2 = salesInvoiceService.createInvoice({
    customerId: customer.id,
    accountId: customer.account_id || customer.accountId,
    invoiceDate: dayjs().format('YYYY-MM-DD'),
    metalType: 'Gold',
    items: [
      {
        itemId: item.id,
        description: 'Diamond Bracelet Inw2',
        barcode: barcodeInw2,
        pcs: 1,
        grossWeight: 15.0,
        lessWeight: 1.0,
        goldRate: 6500,
        labourRate: 500,
        discountAmount: 0
      }
    ],
    payments: [{ paymentMethod: 'CASH', amount: 70000 }]
  })

  // Customer returns the item
  const returnResF = returnTransactionService.create({
    returnType: 'SALES_RETURN',
    originalInvoiceId: sale2.id,
    returnDate: dayjs().format('YYYY-MM-DD'),
    reason: 'Customer exchange',
    items: [
      {
        originalItemId: sale2.items![0].id,
        itemId: item.id,
        barcode: barcodeInw2,
        returnPcs: 1,
        grossWeight: 15.0,
        lessWeight: 1.0
      }
    ],
    refunds: [{ paymentMethod: 'CASH', amount: 70000 }]
  })
  assert(returnResF !== null && !!returnResF.id, 'Customer return transaction executed')

  const updatedStockItemF = stockItemRepo.findByIdentifier(barcodeInw2)
  assert(updatedStockItemF?.status === 'CONSIGNMENT', 'Unsettled returned item restored to CONSIGNMENT custody')
  const citemF = consignmentRepo.getItemByStockItemId(stockItemInw2.id)
  assert(citemF?.status === 'IN_SHOWROOM', 'Consignment item line returned to IN_SHOWROOM')

  // --- Test G: Customer Return After Vendor Settlement ---
  console.log('\n--- Test G: Customer Return After Vendor Settlement ---')
  // For item 0 from Inward 1 (which is fully settled):
  const barcode0StockItem = stockItemRepo.findByIdentifier(barcode0)!
  consignmentService.processCustomerReturn(barcode0StockItem.id, 'RET-TEST-G', 'SL-RET-099')
  const updatedStockItemG = stockItemRepo.findByIdentifier(barcode0)
  assert(
    updatedStockItemG?.status === 'IN_STOCK',
    'Settled consignment item returned by customer transitions to SHOP_OWNED inventory (IN_STOCK)'
  )

  // --- Test K & L: Dashboard Summary with Multiple Consignments ---
  console.log('\n--- Test K & L: Dashboard Summary with Multiple Consignments ---')
  const dashboard = consignmentService.getDashboardSummary()
  assert(dashboard.activeConsignmentsCount >= 2, 'Dashboard tracks active consignments')
  assert(dashboard.totalSettlementPaid >= 100000, 'Dashboard accurately aggregates total settlement paid')

  console.log(`\n=== CONSIGNMENT TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
  if (app) {
    app.quit()
  }
}

if (app && !app.isReady()) {
  app.whenReady().then(() => runConsignmentTests().catch(console.error))
} else {
  runConsignmentTests().catch(console.error)
}
