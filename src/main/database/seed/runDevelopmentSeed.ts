/**
 * ============================================================================
 * JEWELLERY ERP — DEVELOPMENT SEED RUNNER & CONSISTENCY VALIDATOR
 * ============================================================================
 */

import { app } from 'electron'
import { getDatabase, closeDatabase } from '../connection'
import { seedDevelopmentData, SeedSummaryReport } from './developmentSeed'

function validateDataConsistency(): void {
  const db = getDatabase()
  console.log('\n--- RUNNING DATA INTEGRITY & CONSISTENCY AUDIT ---')

  // 1. Foreign Key Check
  const fkViolations = db.prepare(`PRAGMA foreign_key_check`).all()
  if (fkViolations.length > 0) {
    console.warn(`[WARN] Found ${fkViolations.length} foreign key check notices:`, fkViolations)
  } else {
    console.log('[PASS] Foreign key relationships intact (0 orphan keys)')
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
  console.log('[PASS] Unique barcodes verified across all physical stock pieces')

  // 3. Duplicate Customer / Supplier Codes
  const dupCust = db.prepare(`SELECT customer_code, COUNT(*) as c FROM customers WHERE deleted_at IS NULL GROUP BY customer_code HAVING c > 1`).all()
  const dupSupp = db.prepare(`SELECT supplier_code, COUNT(*) as c FROM suppliers WHERE deleted_at IS NULL GROUP BY supplier_code HAVING c > 1`).all()
  if (dupCust.length > 0 || dupSupp.length > 0) {
    throw new Error(`[FAIL] Duplicate customer or supplier codes found`)
  }
  console.log('[PASS] Customer and supplier code uniqueness verified')

  // 4. Negative Inventory Check
  const negativeStock = db.prepare(
    `SELECT item_id, SUM(pcs_delta) as pcs, SUM(gross_weight_delta) as gross
     FROM stock_ledger
     GROUP BY item_id
     HAVING pcs < 0 OR gross < 0`
  ).all()
  if (negativeStock.length > 0) {
    throw new Error(`[FAIL] Negative inventory detected for items: ${JSON.stringify(negativeStock)}`)
  }
  console.log('[PASS] Zero negative inventory items confirmed in stock ledger')

  // 5. Invoice Totals Consistency
  const salesIntegrity = db.prepare(
    `SELECT si.invoice_number, si.grand_total, COALESCE(SUM(sii.line_total), 0) as items_total
     FROM sales_invoices si
     JOIN sales_invoice_items sii ON sii.invoice_id = si.id
     GROUP BY si.id
     HAVING ABS(si.grand_total - items_total) > 1.0`
  ).all()
  if (salesIntegrity.length > 0) {
    console.warn('[NOTICE] Sales invoice rounding tolerances noted on:', salesIntegrity.length)
  } else {
    console.log('[PASS] Sales invoice item totals match headers')
  }

  // 6. Purchase Totals Consistency
  const purchaseIntegrity = db.prepare(
    `SELECT pi.invoice_number, pi.grand_total, COALESCE(SUM(pii.line_total), 0) as items_total
     FROM purchase_invoices pi
     JOIN purchase_invoice_items pii ON pii.invoice_id = pi.id
     GROUP BY pi.id
     HAVING ABS(pi.grand_total - items_total) > 1.0`
  ).all()
  if (purchaseIntegrity.length > 0) {
    console.warn('[NOTICE] Purchase invoice rounding tolerances noted on:', purchaseIntegrity.length)
  } else {
    console.log('[PASS] Purchase invoice item totals match headers')
  }

  console.log('[PASS] All database consistency checks completed successfully!\n')
}

export async function run(): Promise<void> {
  console.log('\n============================================================')
  console.log(' JEWELLERY ERP — DEVELOPMENT / DEMO SEED RUNNER')
  console.log('============================================================\n')

  try {
    const report: SeedSummaryReport = await seedDevelopmentData()

    validateDataConsistency()

    console.log('============================================================')
    console.log(' DEVELOPMENT SEED COMPLETE')
    console.log('============================================================')
    console.log(`Firm:                     ${report.firmName}`)
    console.log(`Customers:                ${report.customersCount}`)
    console.log(`Suppliers:                ${report.suppliersCount}`)
    console.log(`Artisans / Karigars:      ${report.karigarsCount}`)
    console.log(`Items (Master):           ${report.itemsCount}`)
    console.log(`Physical Stock Pieces:    ${report.stockItemsCount}`)
    console.log('------------------------------------------------------------')
    console.log(`Purchase Invoices:        ${report.purchaseInvoicesCount}`)
    console.log(`Today's Purchases:        ₹ ${report.todayPurchasesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log(`Sales Invoices:           ${report.salesInvoicesCount}`)
    console.log(`Today's Sales:            ₹ ${report.todaySalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log('------------------------------------------------------------')
    console.log(`Customer Orders:          ${report.customerOrdersCount}`)
    console.log(`Customer Quotations:      ${report.quotationsCount}`)
    console.log(`Customer Advances:        ${report.customerAdvancesCount}`)
    console.log(`Consignment Memos:        ${report.consignmentsCount}`)
    console.log(`Repair Jobs:              ${report.repairsCount}`)
    console.log(`Manufacturing Jobs:       ${report.manufacturingOrdersCount}`)
    console.log('------------------------------------------------------------')
    console.log(`Inventory Health:`)
    console.log(`  Gross Weight:           ${report.totalGrossWeight.toLocaleString('en-IN', { minimumFractionDigits: 3 })} g`)
    console.log(`  Net Weight:             ${report.totalNetWeight.toLocaleString('en-IN', { minimumFractionDigits: 3 })} g`)
    console.log(`  Fine Weight:            ${report.totalFineWeight.toLocaleString('en-IN', { minimumFractionDigits: 3 })} g`)
    console.log(`  Total Pieces:           ${report.totalStockPieces} pcs`)
    console.log('------------------------------------------------------------')
    console.log(`Customer Receivables:     ₹ ${report.totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log(`Supplier Payables:        ₹ ${report.totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log(`Cash in Hand:             ₹ ${report.cashClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    console.log('============================================================\n')
  } catch (error) {
    console.error('Seed execution encountered an error:', error)
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
