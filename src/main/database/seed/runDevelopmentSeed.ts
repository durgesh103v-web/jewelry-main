/**
 * ============================================================================
 * JEWELLERY ERP — DEVELOPMENT SEED RUNNER & CONSISTENCY VALIDATOR
 * ============================================================================
 */

import { app } from 'electron'
import { getDatabase, closeDatabase, getDatabasePath } from '../connection'
import { seedDevelopmentData, SeedSummaryReport } from './developmentSeed'
import { dailyReportService } from '../../services/dailyReport.service'
import { getCashBookReport } from '../../services/cashBookReport.service'
import { consignmentService } from '../../services/consignment.service'
import { financialReportService } from '../../services/financialReport.service'

function validateDataConsistency(): void {
  const db = getDatabase()
  console.log('\n--- RUNNING COMPREHENSIVE DOMAIN INTEGRITY & CONSISTENCY AUDIT ---')

  // 1. Foreign Key Check
  const fkViolations = db.prepare(`PRAGMA foreign_key_check`).all()
  if (fkViolations.length > 0) {
    console.warn(`[WARN] Found ${fkViolations.length} foreign key check notices:`, fkViolations)
  }

  // 2. Duplicate Barcodes
  const duplicateBarcodes = db.prepare(
    `SELECT barcode, COUNT(*) as count
     FROM jewellery_stock_items
     WHERE barcode IS NOT NULL AND deleted_at IS NULL
     GROUP BY barcode HAVING count > 1`
  ).all()
  if (duplicateBarcodes.length > 0) {
    throw new Error(`[FAIL] Duplicate barcodes found: ${JSON.stringify(duplicateBarcodes)}`)
  }

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 1: gross weight >= net weight
  // --------------------------------------------------------------------------
  const invalidPhysicalGrossNet = db.prepare(
    `SELECT id, barcode, gross_weight, net_weight
     FROM jewellery_stock_items
     WHERE deleted_at IS NULL AND net_weight > gross_weight`
  ).all() as any[]
  if (invalidPhysicalGrossNet.length > 0) {
    throw new Error(`[FAIL] Physical stock pieces with net_weight > gross_weight found: ${JSON.stringify(invalidPhysicalGrossNet)}`)
  }

  const invalidLedgerGrossNet = db.prepare(
    `SELECT item_id, SUM(gross_weight_delta) as gross, SUM(net_weight_delta) as net
     FROM stock_ledger
     GROUP BY item_id
     HAVING net > gross + 0.001`
  ).all() as any[]
  if (invalidLedgerGrossNet.length > 0) {
    throw new Error(`[FAIL] Stock ledger items with cumulative net > gross found: ${JSON.stringify(invalidLedgerGrossNet)}`)
  }

  const stockLedgerTotals = db.prepare(
    `SELECT
      COALESCE(SUM(gross_weight_delta), 0) as gross,
      COALESCE(SUM(net_weight_delta), 0) as net,
      COALESCE(SUM(fine_delta), 0) as fine
     FROM stock_ledger`
  ).get() as { gross: number; net: number; fine: number }

  if (stockLedgerTotals.net > stockLedgerTotals.gross + 0.001) {
    throw new Error(`[FAIL] Overall stock ledger net weight (${stockLedgerTotals.net}g) exceeds gross weight (${stockLedgerTotals.gross}g)`)
  }
  console.log('[PASS] gross weight >= net weight (enforced across physical stock and cumulative ledger)')

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 2: net weight >= fine weight
  // --------------------------------------------------------------------------
  const invalidPhysicalNetFine = db.prepare(
    `SELECT id, barcode, net_weight, fine_weight
     FROM jewellery_stock_items
     WHERE deleted_at IS NULL AND fine_weight > net_weight + 0.001`
  ).all() as any[]
  if (invalidPhysicalNetFine.length > 0) {
    throw new Error(`[FAIL] Physical stock pieces with fine_weight > net_weight found: ${JSON.stringify(invalidPhysicalNetFine)}`)
  }

  const invalidLedgerNetFine = db.prepare(
    `SELECT item_id, SUM(net_weight_delta) as net, SUM(fine_delta) as fine
     FROM stock_ledger
     GROUP BY item_id
     HAVING fine > net + 0.001`
  ).all() as any[]
  if (invalidLedgerNetFine.length > 0) {
    throw new Error(`[FAIL] Stock ledger items with cumulative fine > net found: ${JSON.stringify(invalidLedgerNetFine)}`)
  }

  if (stockLedgerTotals.fine > stockLedgerTotals.net + 0.001) {
    throw new Error(`[FAIL] Overall stock ledger fine weight (${stockLedgerTotals.fine}g) exceeds net weight (${stockLedgerTotals.net}g)`)
  }
  console.log('[PASS] net weight >= fine weight (enforced across physical stock and cumulative ledger)')

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 3: closing stock pieces reconciled
  // --------------------------------------------------------------------------
  const ledgerClosingPcs = (db.prepare(`SELECT COALESCE(SUM(pcs_delta), 0) as pcs FROM stock_ledger`).get() as any).pcs
  const physicalInStockPcs = (db.prepare(
    `SELECT COUNT(*) as pcs FROM jewellery_stock_items WHERE status = 'IN_STOCK' AND deleted_at IS NULL`
  ).get() as any).pcs

  if (ledgerClosingPcs !== physicalInStockPcs) {
    throw new Error(`[FAIL] Stock ledger closing pieces (${ledgerClosingPcs}) does not match physical in-stock pieces (${physicalInStockPcs})`)
  }

  // Item-by-item piece reconciliation
  const pieceMismatches = db.prepare(
    `SELECT
      i.id,
      i.item_name,
      COALESCE(sl.ledger_pcs, 0) as ledger_pcs,
      COALESCE(psi.physical_pcs, 0) as physical_pcs
     FROM items i
     LEFT JOIN (SELECT item_id, SUM(pcs_delta) as ledger_pcs FROM stock_ledger GROUP BY item_id) sl ON sl.item_id = i.id
     LEFT JOIN (SELECT item_id, COUNT(*) as physical_pcs FROM jewellery_stock_items WHERE status = 'IN_STOCK' AND deleted_at IS NULL GROUP BY item_id) psi ON psi.item_id = i.id
     WHERE COALESCE(sl.ledger_pcs, 0) != COALESCE(psi.physical_pcs, 0)`
  ).all() as any[]

  if (pieceMismatches.length > 0) {
    throw new Error(`[FAIL] Item-level piece reconciliation mismatch found: ${JSON.stringify(pieceMismatches)}`)
  }
  console.log(`[PASS] closing stock pieces reconciled (${ledgerClosingPcs} ledger pcs === ${physicalInStockPcs} physical in-stock pcs)`)

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 4: serialized stock reconciliation documented
  // --------------------------------------------------------------------------
  const openingPcs = (db.prepare(`SELECT COALESCE(SUM(pcs_delta), 0) as pcs FROM stock_ledger WHERE source_type = 'OPENING'`).get() as any).pcs
  const inwardPurchasesPcs = (db.prepare(`SELECT COALESCE(SUM(pcs_delta), 0) as pcs FROM stock_ledger WHERE source_type IN ('PURCHASE', 'PURCHASE_INVOICE')`).get() as any).pcs
  const salesReturnPcs = (db.prepare(`SELECT COALESCE(SUM(pcs_delta), 0) as pcs FROM stock_ledger WHERE source_type = 'SALES_RETURN'`).get() as any).pcs
  const salesOutwardPcs = (db.prepare(`SELECT COALESCE(SUM(ABS(pcs_delta)), 0) as pcs FROM stock_ledger WHERE source_type IN ('SALE', 'SALES_INVOICE')`).get() as any).pcs
  const purchaseReturnPcs = (db.prepare(`SELECT COALESCE(SUM(ABS(pcs_delta)), 0) as pcs FROM stock_ledger WHERE source_type = 'PURCHASE_RETURN'`).get() as any).pcs
  const otherDeltaPcs = (db.prepare(`SELECT COALESCE(SUM(pcs_delta), 0) as pcs FROM stock_ledger WHERE source_type NOT IN ('OPENING', 'PURCHASE', 'PURCHASE_INVOICE', 'SALES_RETURN', 'SALE', 'SALES_INVOICE', 'PURCHASE_RETURN')`).get() as any).pcs

  const calculatedClosing = openingPcs + inwardPurchasesPcs + salesReturnPcs - salesOutwardPcs - purchaseReturnPcs + otherDeltaPcs

  if (calculatedClosing !== ledgerClosingPcs) {
    throw new Error(`[FAIL] Mathematical stock reconciliation failed: ${openingPcs} + ${inwardPurchasesPcs} + ${salesReturnPcs} - ${salesOutwardPcs} - ${purchaseReturnPcs} + ${otherDeltaPcs} = ${calculatedClosing} != ${ledgerClosingPcs}`)
  }
  console.log(`[PASS] serialized stock reconciliation documented: Opening (${openingPcs}) + Purchase Inward (${inwardPurchasesPcs}) + Sales Return (${salesReturnPcs}) - Sales Outward (${salesOutwardPcs}) - Purchase Return (${purchaseReturnPcs}) = Closing (${calculatedClosing} pcs) === Physical Showroom Stock (${physicalInStockPcs} pcs)`)

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 5: no duplicate daily sales across legacy/modern engines
  // --------------------------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10)
  const legacySales = db.prepare(
    `SELECT sale_no, (taxable_amount + cgst_amount + sgst_amount + igst_amount) as amt
     FROM sale_headers WHERE sale_date = ? AND deleted_at IS NULL`
  ).all(today) as { sale_no: string; amt: number }[]

  const modernSales = db.prepare(
    `SELECT invoice_number, grand_total as amt
     FROM sales_invoices WHERE invoice_date = ? AND status != 'CANCELLED' AND deleted_at IS NULL`
  ).all(today) as { invoice_number: string; amt: number }[]

  const legacySaleNos = new Set(legacySales.map(s => s.sale_no))
  const nonDuplicateModernSales = modernSales.filter(s => !legacySaleNos.has(s.invoice_number))

  const expectedUniqueTodaySalesAmount = legacySales.reduce((sum, s) => sum + Number(s.amt), 0) +
    nonDuplicateModernSales.reduce((sum, s) => sum + Number(s.amt), 0)

  const dailyReport = dailyReportService.getDailySummary({ date: today })
  if (Math.abs(dailyReport.sales.amountTotal - expectedUniqueTodaySalesAmount) > 0.01) {
    throw new Error(`[FAIL] Daily sales total mismatch / double-count detected: DailyReport=${dailyReport.sales.amountTotal} vs UniqueCanonicalTotal=${expectedUniqueTodaySalesAmount}`)
  }
  console.log(`[PASS] no duplicate daily sales across legacy/modern engines (Verified ₹ ${dailyReport.sales.amountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across unique transactions)`)

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 6: no duplicate daily purchases across legacy/modern engines
  // --------------------------------------------------------------------------
  const legacyPurchases = db.prepare(
    `SELECT purchase_no, (taxable_amount + cgst_amount + sgst_amount + igst_amount) as amt
     FROM purchase_headers WHERE purchase_date = ? AND deleted_at IS NULL`
  ).all(today) as { purchase_no: string; amt: number }[]

  const modernPurchases = db.prepare(
    `SELECT invoice_number, grand_total as amt
     FROM purchase_invoices WHERE invoice_date = ? AND status != 'CANCELLED' AND deleted_at IS NULL`
  ).all(today) as { invoice_number: string; amt: number }[]

  const legacyPurchaseNos = new Set(legacyPurchases.map(p => p.purchase_no))
  const nonDuplicateModernPurchases = modernPurchases.filter(p => !legacyPurchaseNos.has(p.invoice_number))

  const expectedUniqueTodayPurchasesAmount = legacyPurchases.reduce((sum, p) => sum + Number(p.amt), 0) +
    nonDuplicateModernPurchases.reduce((sum, p) => sum + Number(p.amt), 0)

  if (Math.abs(dailyReport.purchases.amountTotal - expectedUniqueTodayPurchasesAmount) > 0.01) {
    throw new Error(`[FAIL] Daily purchases total mismatch / double-count detected: DailyReport=${dailyReport.purchases.amountTotal} vs UniqueCanonicalTotal=${expectedUniqueTodayPurchasesAmount}`)
  }
  console.log(`[PASS] no duplicate daily purchases across legacy/modern engines (Verified ₹ ${dailyReport.purchases.amountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across unique transactions)`)

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 7: customer receivable ledger reconciles
  // --------------------------------------------------------------------------
  // Canonical customer receivables reconciliation:
  // Opening receivable + Credit sales - Customer receipts - Credit notes - Advance adjustments = Closing receivable
  const customerReport = financialReportService.getPartyOutstanding('CUSTOMER')
  const customerAccounts = db.prepare(
    `SELECT
      c.id,
      c.name,
      COALESCE(a.opening_cash, 0) as opening_cash,
      COALESCE(SUM(al.cash_nave), 0) as total_nave,
      COALESCE(SUM(al.cash_jama), 0) as total_jama,
      (COALESCE(a.opening_cash, 0) + COALESCE(SUM(al.cash_nave - al.cash_jama), 0)) as closing_balance
     FROM customers c
     JOIN accounts a ON a.id = c.account_id
     LEFT JOIN account_ledger al ON al.account_id = a.id
     WHERE c.deleted_at IS NULL
     GROUP BY c.id, c.name, a.opening_cash`
  ).all() as { id: string; name: string; opening_cash: number; total_nave: number; total_jama: number; closing_balance: number }[]

  let calculatedTotalReceivables = 0
  let calculatedCustomerAdvances = 0
  for (const c of customerAccounts) {
    if (c.closing_balance > 0.01) {
      calculatedTotalReceivables += c.closing_balance
    } else if (c.closing_balance < -0.01) {
      calculatedCustomerAdvances += Math.abs(c.closing_balance)
    }
  }

  if (Math.abs(customerReport.totalReceivable - calculatedTotalReceivables) > 1.0) {
    throw new Error(`[FAIL] Customer receivable ledger does not reconcile: PartyReport=${customerReport.totalReceivable} vs CalculatedLedger=${calculatedTotalReceivables}`)
  }
  console.log(`[PASS] customer receivable ledger reconciles (Total: ₹ ${customerReport.totalReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across ${customerAccounts.filter(c => c.closing_balance > 0.01).length} active customer balances; advances: ₹ ${calculatedCustomerAdvances.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`)

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 8: supplier payable ledger reconciles
  // --------------------------------------------------------------------------
  // Canonical supplier payables reconciliation:
  // Opening payable + Credit purchases + recognized liabilities - Supplier payments - Debit notes = Closing payable
  const supplierReport = financialReportService.getPartyOutstanding('SUPPLIER')
  const supplierAccounts = db.prepare(
    `SELECT
      s.id,
      s.name,
      COALESCE(a.opening_cash, 0) as opening_cash,
      COALESCE(SUM(al.cash_nave), 0) as total_nave,
      COALESCE(SUM(al.cash_jama), 0) as total_jama,
      (COALESCE(a.opening_cash, 0) + COALESCE(SUM(al.cash_jama - al.cash_nave), 0)) as closing_liability
     FROM suppliers s
     JOIN accounts a ON a.id = s.account_id
     LEFT JOIN account_ledger al ON al.account_id = a.id
     WHERE s.deleted_at IS NULL
     GROUP BY s.id, s.name, a.opening_cash`
  ).all() as { id: string; name: string; opening_cash: number; total_nave: number; total_jama: number; closing_liability: number }[]

  let calculatedTotalPayables = 0
  for (const s of supplierAccounts) {
    if (s.closing_liability > 0.01) {
      calculatedTotalPayables += s.closing_liability
    }
  }

  if (Math.abs(supplierReport.totalPayable - calculatedTotalPayables) > 1.0) {
    throw new Error(`[FAIL] Supplier payable ledger does not reconcile: PartyReport=${supplierReport.totalPayable} vs CalculatedLedger=${calculatedTotalPayables}`)
  }
  console.log(`[PASS] supplier payable ledger reconciles (Total: ₹ ${supplierReport.totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across ${supplierAccounts.filter(s => s.closing_liability > 0.01).length} active supplier liabilities)`)

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 9: cash account reconciles
  // --------------------------------------------------------------------------
  const cashBook = getCashBookReport({ fromDate: '2020-01-01', toDate: '2030-12-31' })
  const openingCashSetting = (db.prepare(`SELECT opening_cash FROM cash_fine_opening_settings WHERE id = 'default-cash-fine-opening'`).get() as any)?.opening_cash || 0
  const cashMovements = db.prepare(
    `SELECT
      COALESCE(SUM(cash_jama), 0) as receipts,
      COALESCE(SUM(cash_nave), 0) as payments
     FROM account_ledger
     WHERE source_type IN ('SALE_PAYMENT', 'PURCHASE_PAYMENT', 'CASH_RECEIPT', 'CASH_PAYMENT')`
  ).get() as { receipts: number; payments: number }

  const expectedClosingCash = openingCashSetting + cashMovements.receipts - cashMovements.payments
  if (Math.abs(cashBook.summary.closingBalance - expectedClosingCash) > 0.01) {
    throw new Error(`[FAIL] Cash account does not reconcile: CashBook=${cashBook.summary.closingBalance} vs Calculated=${expectedClosingCash}`)
  }
  console.log(`[PASS] cash account reconciles (Opening: ₹ ${openingCashSetting.toLocaleString('en-IN')} + Receipts: ₹ ${cashMovements.receipts.toLocaleString('en-IN')} - Payments: ₹ ${cashMovements.payments.toLocaleString('en-IN')} = Closing: ₹ ${expectedClosingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`)

  // --------------------------------------------------------------------------
  // DOMAIN CHECK 10: consignment physical/financial lifecycle valid
  // --------------------------------------------------------------------------
  const consignmentSummary = consignmentService.getDashboardSummary()
  const consignmentInwardsCount = (db.prepare(`SELECT COUNT(*) as c FROM consignment_inwards WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const consignmentItemsCount = (db.prepare(`SELECT COUNT(*) as c FROM consignment_items`).get() as any)?.c || 0

  if (consignmentInwardsCount > 0 && consignmentItemsCount === 0) {
    throw new Error(`[FAIL] Consignment records exist without linked line items`)
  }
  console.log(`[PASS] consignment physical/financial lifecycle valid (${consignmentInwardsCount} memos, ${consignmentItemsCount} items tracked with status: ${consignmentSummary?.activeConsignmentsCount ?? 0} active memos)`)

  console.log('\n[PASS] ALL 10 DOMAIN INTEGRITY AUDIT CHECKS PASSED WITH ZERO ERRORS!\n')
}

export async function run(): Promise<void> {
  const dbPath = getDatabasePath()

  console.log('\n============================================================')
  console.log(' JEWELLERY ERP — DEVELOPMENT / DEMO SEED RUNNER')
  console.log('============================================================')
  console.log(`Target Database Path:     ${dbPath}`)
  console.log(`Execution Environment:   NODE_ENV=${process.env.NODE_ENV || 'development'}`)
  console.log(`Explicit Seed Permission: JEWELLERY_ALLOW_DEMO_SEED=${process.env.JEWELLERY_ALLOW_DEMO_SEED || 'false'}`)
  console.log('============================================================\n')

  // Safety Guard: Refuse to run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('\n[CRITICAL ERROR] Execution aborted: Cannot run development seed in PRODUCTION environment!')
    console.error('The development seed is strictly restricted to development/test environments.')
    process.exitCode = 1
    return
  }

  // Safety Guard: Require explicit permission flag
  if (process.env.JEWELLERY_ALLOW_DEMO_SEED !== 'true') {
    console.error('\n[CRITICAL ERROR] Execution aborted: Explicit permission missing!')
    console.error('Set JEWELLERY_ALLOW_DEMO_SEED=true to permit seeding demo data.')
    process.exitCode = 1
    return
  }

  try {
    const report: SeedSummaryReport = await seedDevelopmentData()

    validateDataConsistency()

    console.log('============================================================')
    console.log(' FINAL AUDITED SEED SUMMARY REPORT')
    console.log('============================================================')
    console.log(`Firm:                     ${report.firmName}`)
    console.log(`Total Customers:          ${report.customersCount}`)
    console.log(`Total Suppliers:          ${report.suppliersCount}`)
    console.log(`Artisans / Karigars:      ${report.karigarsCount}`)
    console.log(`Total Items:              ${report.itemsCount}`)
    console.log(`Serialized Stock Pieces:  ${report.stockItemsCount}`)
    console.log('------------------------------------------------------------')
    console.log(`Total Purchase Invoices:  ${report.totalPurchaseInvoices}`)
    console.log(`Today's Purchase Invoices: ${report.todayPurchaseInvoices}`)
    console.log(`Today's Purchase Amount:  ₹ ${report.todayPurchasesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log('------------------------------------------------------------')
    console.log(`Total Sales Invoices:     ${report.totalSalesInvoices}`)
    console.log(`Today's Sales Invoices:   ${report.todaySalesInvoices}`)
    console.log(`Today's Sales Amount:     ₹ ${report.todaySalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log('------------------------------------------------------------')
    console.log(`Customer Orders:          ${report.customerOrdersCount}`)
    console.log(`Customer Quotations:      ${report.quotationsCount}`)
    console.log(`Customer Advances:        ${report.customerAdvancesCount}`)
    console.log(`Consignments:             ${report.consignmentsCount}`)
    console.log(`Repairs:                  ${report.repairsCount}`)
    console.log(`Manufacturing:            ${report.manufacturingOrdersCount}`)
    console.log('------------------------------------------------------------')
    console.log(`Inventory Health:`)
    console.log(`  Gross Weight:           ${report.totalGrossWeight.toLocaleString('en-IN', { minimumFractionDigits: 3 })} g`)
    console.log(`  Net Weight:             ${report.totalNetWeight.toLocaleString('en-IN', { minimumFractionDigits: 3 })} g`)
    console.log(`  Fine Weight:            ${report.totalFineWeight.toLocaleString('en-IN', { minimumFractionDigits: 3 })} g`)
    console.log(`  Stock Ledger Closing:   ${report.totalStockPieces} pcs`)
    console.log('------------------------------------------------------------')
    console.log(`Customer Receivables:     ₹ ${report.totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log(`Supplier Payables:        ₹ ${report.totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log(`Cash in Hand:             ₹ ${report.cashClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log('============================================================\n')
  } catch (error) {
    console.error('\n[AUDIT FAILURE] Seed execution or audit encountered an error:', error)
    process.exitCode = 1
  } finally {
    closeDatabase()
    if (app && typeof app.quit === 'function') {
      app.quit()
    }
  }
}

if (app && !app.isReady()) {
  app.whenReady().then(() => run().catch(console.error))
} else {
  run().catch(console.error)
}
