import { app } from 'electron'
import { getDatabase } from '../database/connection'
import { migration018 } from '../database/migrations/018_vendor_consignment_and_memo'
import { consignmentService } from '../services/consignment.service'
import { salesInvoiceService } from '../services/salesInvoice.service'
import { ConsignmentRepository } from '../database/repositories/ConsignmentRepository'
import { JewelleryStockItemRepository } from '../database/repositories/JewelleryStockItemRepository'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'

export async function runConsignmentTests() {
  console.log('=== RUNNING CONSIGNMENT & MEMO INWARD BACKEND TESTS ===')
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
  let supplierAccount = db.prepare(`SELECT * FROM accounts WHERE name = 'Test Consignment Supplier Account'`).get() as any
  if (!supplierAccount) {
    const accId = uuidv4()
    db.prepare(`
      INSERT INTO accounts (id, name, group_id, opening_cash, opening_gold_fine, opening_silver_fine, created_at, updated_at)
      VALUES (?, 'Test Consignment Supplier Account', (SELECT id FROM account_groups LIMIT 1), 0, 0, 0, datetime('now'), datetime('now'))
    `).run(accId)
    supplierAccount = { id: accId }
  }

  let supplier = db.prepare(`SELECT * FROM suppliers WHERE name = 'Diamond Star Wholesalers'`).get() as any
  if (!supplier) {
    const suppId = uuidv4()
    db.prepare(`
      INSERT INTO suppliers (id, name, phone, account_id, created_at, updated_at)
      VALUES (?, 'Diamond Star Wholesalers', '9876543210', ?, datetime('now'), datetime('now'))
    `).run(suppId, supplierAccount.id)
    supplier = { id: suppId, name: 'Diamond Star Wholesalers', account_id: supplierAccount.id }
  }

  // Ensure test item
  let item = db.prepare(`SELECT * FROM items WHERE item_name = 'Diamond Necklace 18K'`).get() as any
  if (!item) {
    const itemId = uuidv4()
    db.prepare(`
      INSERT INTO items (id, item_name, item_code, metal_type, default_tanch, default_labour_rate, active, created_at, updated_at)
      VALUES (?, 'Diamond Necklace 18K', 'DN-18K', 'Gold', 75, 500, 1, datetime('now'), datetime('now'))
    `).run(itemId)
    item = { id: itemId, item_name: 'Diamond Necklace 18K', metal_type: 'Gold' }
  }

  let customer = db.prepare(`SELECT * FROM customers LIMIT 1`).get() as any
  if (!customer) {
    const cId = uuidv4()
    const cAccId = uuidv4()
    db.prepare(`
      INSERT INTO accounts (id, name, group_id, opening_cash, opening_gold_fine, opening_silver_fine, created_at, updated_at)
      VALUES (?, 'Consignment Test Customer Account', (SELECT id FROM account_groups LIMIT 1), 0, 0, 0, datetime('now'), datetime('now'))
    `).run(cAccId)
    db.prepare(`
      INSERT INTO customers (id, name, mobile, account_id, created_at, updated_at)
      VALUES (?, 'Consignment Test Customer', '9998887776', ?, datetime('now'), datetime('now'))
    `).run(cId, cAccId)
    customer = { id: cId, name: 'Consignment Test Customer', account_id: cAccId }
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

  // TEST 1: Inward Intake (5 pieces)
  console.log('\n--- Test 1: Inward Intake (5 pieces) ---')
  const inward1 = consignmentService.createInward({
    supplierId: supplier.id,
    inwardDate: dayjs().format('YYYY-MM-DD'),
    expectedReturnDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    notes: 'Exhibition consignment items',
    items: Array.from({ length: 5 }, (_, i) => ({
      itemId: item.id,
      vendorItemCode: `V-NECK-00${i + 1}`,
      grossWeight: 25.5,
      netWeight: 24.0,
      fineWeight: 18.0,
      purityName: '18K',
      tunch: 75,
      vendorCost: 120000,
      retailPrice: 165000,
      counter: 'Bridal Counter',
      tray: 'Tray 1'
    }))
  })

  const fetchedInward1 = consignmentService.getInwardById(inward1.id)
  assert(fetchedInward1 !== null, 'Inward record retrieved')
  assert(fetchedInward1?.totalPieces === 5, 'Total pieces is 5')
  assert(fetchedInward1?.status === 'ACTIVE', 'Inward status is ACTIVE')
  assert(fetchedInward1?.items?.length === 5, '5 consignment item lines created')

  // Verify stock items
  const item1Barcode = fetchedInward1?.items?.[0].barcode
  const stockItem1 = stockItemRepo.findByIdentifier(item1Barcode!)
  assert(stockItem1 !== null, 'Physical stock item created and resolvable by barcode')
  assert(stockItem1?.status === 'CONSIGNMENT', 'Physical stock status is CONSIGNMENT')

  // TEST 2: Barcode Resolution
  console.log('\n--- Test 2: Barcode Resolution ---')
  const resolved = consignmentService.getActiveItemByBarcode(item1Barcode!)
  assert(resolved !== null, 'Active consignment item resolved by barcode')
  assert(resolved?.vendorCost === 120000, 'Vendor cost preserved on consignment item')
  assert(resolved?.status === 'IN_SHOWROOM', 'Item status is IN_SHOWROOM')

  // TEST 3: POS Sale of Consignment Piece
  console.log('\n--- Test 3: POS Sale & Auto-Purchase Recognition ---')
  const initialSupplierLedgerCount = (db.prepare(`SELECT COUNT(*) as cnt FROM account_ledger WHERE account_id = ?`).get(supplier.account_id) as any).cnt
  
  const sale1 = salesInvoiceService.createInvoice({
    customerId: customer.id,
    accountId: customer.account_id || customer.accountId,
    invoiceDate: dayjs().format('YYYY-MM-DD'),
    metalType: 'Gold',
    items: [
      {
        itemId: item.id,
        description: 'Diamond Necklace 18K (Consignment)',
        barcode: item1Barcode!,
        pcs: 1,
        grossWeight: 25.5,
        lessWeight: 1.5,
        goldRate: 6500,
        labourRate: 500,
        discountAmount: 0
      }
    ],
    payments: [
      {
        paymentMethod: 'CASH',
        amount: 170000
      }
    ]
  })

  assert(sale1 !== null, 'Sales Invoice created with consignment piece')
  const updatedStockItem1 = stockItemRepo.findByIdentifier(item1Barcode!)
  assert(updatedStockItem1?.status === 'SOLD', 'Physical stock item transitioned to SOLD')
  
  const updatedCItem1 = consignmentRepo.getItemByStockItemId(stockItem1!.id)
  assert(updatedCItem1?.status === 'SOLD', 'Consignment item status transitioned to SOLD')

  const postSupplierLedgerCount = (db.prepare(`SELECT COUNT(*) as cnt FROM account_ledger WHERE account_id = ?`).get(supplier.account_id) as any).cnt
  assert(postSupplierLedgerCount > initialSupplierLedgerCount, 'Supplier payable posted to account_ledger upon consignment sale')

  // TEST 4 & 5: Partial Sale and Return to Vendor
  console.log('\n--- Test 4 & 5: Partial Sale and Return to Vendor ---')
  // Inward 1 had 5 items. 1 is SOLD. 4 are IN_SHOWROOM.
  const fetchedInwardAfterSale = consignmentService.getInwardById(inward1.id)
  assert(fetchedInwardAfterSale?.status === 'PARTIALLY_SETTLED', 'Inward status transitioned to PARTIALLY_SETTLED')

  // Return 2 items to vendor
  const item2Id = fetchedInwardAfterSale?.items?.[1].id!
  const item3Id = fetchedInwardAfterSale?.items?.[2].id!
  
  const returnRes = consignmentService.returnToVendor({
    consignmentInwardId: inward1.id,
    consignmentItemIds: [item2Id, item3Id],
    returnDate: dayjs().format('YYYY-MM-DD'),
    notes: 'Returning 2 unsold pieces'
  })

  assert(returnRes.returnNumber.startsWith('CNR'), 'Vendor Return record generated with CNR sequence')
  const item2AfterRet = consignmentRepo.getItemById(item2Id)
  assert(item2AfterRet?.status === 'RETURNED', 'Returned item marked RETURNED')

  // TEST 6: Duplicate Return Rejection
  console.log('\n--- Test 6: Duplicate Return Rejection ---')
  let duplicateReturnRejected = false
  try {
    consignmentService.returnToVendor({
      consignmentInwardId: inward1.id,
      consignmentItemIds: [item2Id],
      returnDate: dayjs().format('YYYY-MM-DD')
    })
  } catch (err: any) {
    duplicateReturnRejected = true
  }
  assert(duplicateReturnRejected, 'Duplicate vendor return rejected with ConflictError')

  // TEST 7: Sold Return Rejection
  console.log('\n--- Test 7: Sold Return Rejection ---')
  let soldReturnRejected = false
  try {
    consignmentService.returnToVendor({
      consignmentInwardId: inward1.id,
      consignmentItemIds: [fetchedInwardAfterSale?.items?.[0].id!],
      returnDate: dayjs().format('YYYY-MM-DD')
    })
  } catch (err: any) {
    soldReturnRejected = true
  }
  assert(soldReturnRejected, 'Vendor return of SOLD item rejected with ConflictError')

  // TEST 8: Dashboard Summary
  console.log('\n--- Test 8: Dashboard Summary ---')
  const dashboard = consignmentService.getDashboardSummary()
  assert(dashboard.activeConsignmentsCount > 0, 'Dashboard tracks active consignments count')
  assert(dashboard.piecesSoldTotal > 0, 'Dashboard tracks sold consignment pieces')
  assert(dashboard.piecesReturnedTotal >= 2, 'Dashboard tracks returned consignment pieces')

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
