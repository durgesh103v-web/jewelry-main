import { BaseRepository } from './BaseRepository'
import type {
  GstState,
  GstHsnCode,
  GstTaxRate,
  Gstr1Report,
  Gstr1B2BInvoice,
  Gstr1B2CSummary,
  Gstr1CreditNote,
  Gstr3BReport,
  HsnSummaryReport,
  HsnSummaryItem,
  TaxRegisterReport,
  TaxRegisterRow,
  TaxDashboardReport
} from '../../../shared/types/tax'

export class TaxRepository extends BaseRepository {
  /**
   * Get all Indian States
   */
  getStates(): GstState[] {
    const rows = this.db.prepare(`SELECT code, name, tin_code FROM gst_states ORDER BY code ASC`).all() as any[]
    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      tinCode: r.tin_code
    }))
  }

  /**
   * Get HSN Master records
   */
  getHsnCodes(): GstHsnCode[] {
    const rows = this.db.prepare(`SELECT * FROM gst_hsn_master WHERE active = 1 ORDER BY hsn_code ASC`).all() as any[]
    return rows.map((r) => ({
      id: r.id,
      hsnCode: r.hsn_code,
      description: r.description,
      defaultGstRate: Number(r.default_gst_rate || 3.0),
      type: r.type,
      active: Boolean(r.active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  /**
   * Get Tax Rates
   */
  getTaxRates(): GstTaxRate[] {
    const rows = this.db.prepare(`SELECT * FROM gst_tax_rates WHERE active = 1 ORDER BY igst_rate ASC`).all() as any[]
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      igstRate: Number(r.igst_rate || 0),
      cgstRate: Number(r.cgst_rate || 0),
      sgstRate: Number(r.sgst_rate || 0),
      cessRate: Number(r.cess_rate || 0),
      isDefault: Boolean(r.is_default),
      active: Boolean(r.active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  /**
   * Fetch Business Firm State Code
   */
  getFirmState(): { stateCode: string; gstin: string } {
    const firm = this.db.prepare(`SELECT state, gst_no FROM firm_settings LIMIT 1`).get() as any
    const gstin = firm?.gst_no || ''
    // If state code isn't explicitly 2 digits, extract first 2 digits from GSTIN if present, or default '24' (Gujarat)
    let stateCode = firm?.state || '24'
    if (gstin && gstin.length >= 2 && !isNaN(Number(gstin.slice(0, 2)))) {
      stateCode = gstin.slice(0, 2)
    }
    return { stateCode, gstin }
  }

  /**
   * GSTR-1 Report
   */
  getGstr1Report(startDate: string, endDate: string): Gstr1Report {
    // 1. B2B Invoices (Registered Customers with valid GSTIN)
    const b2bQuery = `
      SELECT
        c.gst_no,
        c.name AS customer_name,
        si.invoice_number,
        si.invoice_date,
        si.grand_total AS invoice_value,
        COALESCE(si.place_of_supply, '24') AS place_of_supply,
        si.taxable_amount,
        COALESCE(si.tax_percent, 3.0) AS tax_rate,
        si.igst_amount,
        si.cgst_amount,
        si.sgst_amount,
        si.cess_amount
      FROM sales_invoices si
      JOIN customers c ON c.id = si.customer_id
      WHERE si.deleted_at IS NULL
        AND c.gst_no IS NOT NULL AND c.gst_no != ''
        AND si.invoice_date >= ? AND si.invoice_date <= ?
      ORDER BY si.invoice_date ASC
    `
    const b2bRows = this.db.prepare(b2bQuery).all(startDate, endDate) as any[]
    const b2bInvoices: Gstr1B2BInvoice[] = b2bRows.map((r) => ({
      gstin: r.gst_no,
      customerName: r.customer_name,
      invoiceNumber: r.invoice_number,
      invoiceDate: r.invoice_date,
      invoiceValue: Number(r.invoice_value || 0),
      placeOfSupply: r.place_of_supply,
      reverseCharge: false,
      taxableValue: Number(r.taxable_amount || 0),
      taxRate: Number(r.tax_rate || 3.0),
      igstAmount: Number(r.igst_amount || 0),
      cgstAmount: Number(r.cgst_amount || 0),
      sgstAmount: Number(r.sgst_amount || 0),
      cessAmount: Number(r.cess_amount || 0)
    }))

    // 2. B2C Summaries (Unregistered Customers grouped by POS & Tax Rate)
    const b2cQuery = `
      SELECT
        COALESCE(si.place_of_supply, '24') AS place_of_supply,
        COALESCE(si.tax_percent, 3.0) AS tax_rate,
        SUM(si.taxable_amount) AS taxable_value,
        SUM(si.igst_amount) AS igst_amount,
        SUM(si.cgst_amount) AS cgst_amount,
        SUM(si.sgst_amount) AS sgst_amount,
        SUM(si.cess_amount) AS cess_amount
      FROM sales_invoices si
      LEFT JOIN customers c ON c.id = si.customer_id
      WHERE si.deleted_at IS NULL
        AND (c.gst_no IS NULL OR c.gst_no = '')
        AND si.invoice_date >= ? AND si.invoice_date <= ?
      GROUP BY place_of_supply, tax_rate
      ORDER BY place_of_supply ASC
    `
    const b2cRows = this.db.prepare(b2cQuery).all(startDate, endDate) as any[]
    const b2cSummaries: Gstr1B2CSummary[] = b2cRows.map((r) => ({
      placeOfSupply: r.place_of_supply,
      taxRate: Number(r.tax_rate || 3.0),
      taxableValue: Number(r.taxable_value || 0),
      cessAmount: Number(r.cess_amount || 0),
      igstAmount: Number(r.igst_amount || 0),
      cgstAmount: Number(r.cgst_amount || 0),
      sgstAmount: Number(r.sgst_amount || 0)
    }))

    // 3. Credit / Debit Notes (CDNR)
    const cdnrQuery = `
      SELECT
        c.gst_no,
        COALESCE(c.name, s.name, a.account_name) AS party_name,
        rt.return_number,
        rt.return_date,
        rt.original_invoice_number,
        rt.note_type,
        COALESCE(rt.place_of_supply, '24') AS place_of_supply,
        rt.taxable_amount,
        COALESCE(rt.tax_percent, 3.0) AS tax_rate,
        rt.igst_amount,
        rt.cgst_amount,
        rt.sgst_amount,
        rt.cess_amount
      FROM return_transactions rt
      LEFT JOIN customers c ON c.id = rt.customer_id
      LEFT JOIN suppliers s ON s.id = rt.supplier_id
      JOIN accounts a ON a.id = rt.account_id
      WHERE rt.deleted_at IS NULL
        AND rt.return_date >= ? AND rt.return_date <= ?
      ORDER BY rt.return_date ASC
    `
    const cdnrRows = this.db.prepare(cdnrQuery).all(startDate, endDate) as any[]
    const creditDebitNotes: Gstr1CreditNote[] = cdnrRows.map((r) => ({
      gstin: r.gst_no,
      partyName: r.party_name || 'Party',
      creditNoteNumber: r.return_number,
      creditNoteDate: r.return_date,
      originalInvoiceNumber: r.original_invoice_number || '',
      noteType: r.note_type,
      placeOfSupply: r.place_of_supply,
      reverseCharge: false,
      taxableValue: Number(r.taxable_amount || 0),
      taxRate: Number(r.tax_rate || 3.0),
      igstAmount: Number(r.igst_amount || 0),
      cgstAmount: Number(r.cgst_amount || 0),
      sgstAmount: Number(r.sgst_amount || 0),
      cessAmount: Number(r.cess_amount || 0)
    }))

    // Totals
    let totalTaxableValue = 0
    let totalIgst = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalCess = 0

    for (const b of b2bInvoices) {
      totalTaxableValue += b.taxableValue
      totalIgst += b.igstAmount
      totalCgst += b.cgstAmount
      totalSgst += b.sgstAmount
      totalCess += b.cessAmount
    }
    for (const c of b2cSummaries) {
      totalTaxableValue += c.taxableValue
      totalIgst += c.igstAmount
      totalCgst += c.cgstAmount
      totalSgst += c.sgstAmount
      totalCess += c.cessAmount
    }

    const totalTax = totalIgst + totalCgst + totalSgst + totalCess

    return {
      startDate,
      endDate,
      b2bInvoices,
      b2cSummaries,
      creditDebitNotes,
      totalTaxableValue,
      totalIgst,
      totalCgst,
      totalSgst,
      totalCess,
      totalTax
    }
  }

  /**
   * GSTR-3B Summary Report
   */
  getGstr3BReport(startDate: string, endDate: string): Gstr3BReport {
    // 1. Outward Taxable Supplies (Sales minus Sales Returns)
    const salesAgg = this.db
      .prepare(
        `
        SELECT
          SUM(taxable_amount) AS taxable,
          SUM(igst_amount) AS igst,
          SUM(cgst_amount) AS cgst,
          SUM(sgst_amount) AS sgst,
          SUM(cess_amount) AS cess
        FROM sales_invoices
        WHERE deleted_at IS NULL AND invoice_date >= ? AND invoice_date <= ?
      `
      )
      .get(startDate, endDate) as any

    const salesReturnAgg = this.db
      .prepare(
        `
        SELECT
          SUM(taxable_amount) AS taxable,
          SUM(igst_amount) AS igst,
          SUM(cgst_amount) AS cgst,
          SUM(sgst_amount) AS sgst,
          SUM(cess_amount) AS cess
        FROM return_transactions
        WHERE deleted_at IS NULL AND return_type = 'SALES_RETURN' AND return_date >= ? AND return_date <= ?
      `
      )
      .get(startDate, endDate) as any

    const netSalesTaxable = Math.max(0, Number(salesAgg?.taxable || 0) - Number(salesReturnAgg?.taxable || 0))
    const netSalesIgst = Math.max(0, Number(salesAgg?.igst || 0) - Number(salesReturnAgg?.igst || 0))
    const netSalesCgst = Math.max(0, Number(salesAgg?.cgst || 0) - Number(salesReturnAgg?.cgst || 0))
    const netSalesSgst = Math.max(0, Number(salesAgg?.sgst || 0) - Number(salesReturnAgg?.sgst || 0))
    const netSalesCess = Math.max(0, Number(salesAgg?.cess || 0) - Number(salesReturnAgg?.cess || 0))

    // 2. Inward Eligible ITC (Purchases minus Purchase Returns)
    const purchAgg = this.db
      .prepare(
        `
        SELECT
          SUM(taxable_amount) AS taxable,
          SUM(igst_amount) AS igst,
          SUM(cgst_amount) AS cgst,
          SUM(sgst_amount) AS sgst,
          SUM(cess_amount) AS cess
        FROM purchase_invoices
        WHERE deleted_at IS NULL AND is_itc_eligible = 1 AND invoice_date >= ? AND invoice_date <= ?
      `
      )
      .get(startDate, endDate) as any

    const purchReturnAgg = this.db
      .prepare(
        `
        SELECT
          SUM(taxable_amount) AS taxable,
          SUM(igst_amount) AS igst,
          SUM(cgst_amount) AS cgst,
          SUM(sgst_amount) AS sgst,
          SUM(cess_amount) AS cess
        FROM return_transactions
        WHERE deleted_at IS NULL AND return_type = 'PURCHASE_RETURN' AND return_date >= ? AND return_date <= ?
      `
      )
      .get(startDate, endDate) as any

    const netPurchTaxable = Math.max(0, Number(purchAgg?.taxable || 0) - Number(purchReturnAgg?.taxable || 0))
    const netPurchIgst = Math.max(0, Number(purchAgg?.igst || 0) - Number(purchReturnAgg?.igst || 0))
    const netPurchCgst = Math.max(0, Number(purchAgg?.cgst || 0) - Number(purchReturnAgg?.cgst || 0))
    const netPurchSgst = Math.max(0, Number(purchAgg?.sgst || 0) - Number(purchReturnAgg?.sgst || 0))
    const netPurchCess = Math.max(0, Number(purchAgg?.cess || 0) - Number(purchReturnAgg?.cess || 0))

    // 3. Net Tax Payable Calculation
    const payableIgst = Math.max(0, netSalesIgst - netPurchIgst)
    const payableCgst = Math.max(0, netSalesCgst - netPurchCgst)
    const payableSgst = Math.max(0, netSalesSgst - netPurchSgst)
    const payableCess = Math.max(0, netSalesCess - netPurchCess)

    return {
      startDate,
      endDate,
      outwardTaxableSupplies: {
        natureOfSupplies: '3.1 (a) Outward taxable supplies (other than zero rated, nil rated and exempted)',
        totalTaxableValue: netSalesTaxable,
        integratedTax: netSalesIgst,
        centralTax: netSalesCgst,
        stateTax: netSalesSgst,
        cess: netSalesCess
      },
      outwardZeroRated: {
        natureOfSupplies: '3.1 (b) Outward taxable supplies (zero rated)',
        totalTaxableValue: 0,
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0
      },
      inwardReverseCharge: {
        natureOfSupplies: '3.1 (d) Inward supplies (liable to reverse charge)',
        totalTaxableValue: 0,
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0
      },
      eligibleItc: {
        allOtherItc: {
          natureOfSupplies: '4 (A) (5) All other ITC',
          totalTaxableValue: netPurchTaxable,
          integratedTax: netPurchIgst,
          centralTax: netPurchCgst,
          stateTax: netPurchSgst,
          cess: netPurchCess
        },
        netItcAvailable: {
          natureOfSupplies: '4 (C) Net ITC Available (A) - (B)',
          totalTaxableValue: netPurchTaxable,
          integratedTax: netPurchIgst,
          centralTax: netPurchCgst,
          stateTax: netPurchSgst,
          cess: netPurchCess
        }
      },
      netTaxPayable: {
        integratedTax: payableIgst,
        centralTax: payableCgst,
        stateTax: payableSgst,
        cess: payableCess,
        totalPayable: payableIgst + payableCgst + payableSgst + payableCess
      }
    }
  }

  /**
   * HSN Summary Report
   */
  getHsnSummaryReport(startDate: string, endDate: string): HsnSummaryReport {
    const query = `
      SELECT
        COALESCE(sii.hsn_code, '7113') AS hsn_code,
        COALESCE(hm.description, 'Articles of jewellery and parts thereof of precious metal') AS description,
        'GMS' AS uom,
        SUM(sii.quantity) AS total_quantity,
        SUM(sii.gross_weight) AS total_gross_weight,
        SUM(sii.fine_weight) AS total_fine_weight,
        SUM(sii.line_total) AS total_value,
        SUM(sii.taxable_amount) AS taxable_value,
        SUM(sii.igst_amount) AS integrated_tax,
        SUM(sii.cgst_amount) AS central_tax,
        SUM(sii.sgst_amount) AS state_tax,
        SUM(sii.cess_amount) AS cess
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.sales_invoice_id
      LEFT JOIN gst_hsn_master hm ON hm.hsn_code = sii.hsn_code
      WHERE si.deleted_at IS NULL AND si.invoice_date >= ? AND si.invoice_date <= ?
      GROUP BY sii.hsn_code
      ORDER BY total_value DESC
    `
    const rows = this.db.prepare(query).all(startDate, endDate) as any[]

    let totalTaxableValue = 0
    let totalIgst = 0
    let totalCgst = 0
    let totalSgst = 0

    const items: HsnSummaryItem[] = rows.map((r) => {
      const taxVal = Number(r.taxable_value || 0)
      const igst = Number(r.integrated_tax || 0)
      const cgst = Number(r.central_tax || 0)
      const sgst = Number(r.state_tax || 0)

      totalTaxableValue += taxVal
      totalIgst += igst
      totalCgst += cgst
      totalSgst += sgst

      return {
        hsnCode: r.hsn_code,
        description: r.description,
        uom: r.uom,
        totalQuantity: Number(r.total_quantity || 0),
        totalGrossWeight: Number(r.total_gross_weight || 0),
        totalFineWeight: Number(r.total_fine_weight || 0),
        totalValue: Number(r.total_value || 0),
        taxableValue: taxVal,
        integratedTax: igst,
        centralTax: cgst,
        stateTax: sgst,
        cess: Number(r.cess || 0)
      }
    })

    return {
      startDate,
      endDate,
      items,
      totalTaxableValue,
      totalIgst,
      totalCgst,
      totalSgst,
      totalTax: totalIgst + totalCgst + totalSgst
    }
  }

  /**
   * Tax Registers (Sales Tax Register / Purchase Tax Register)
   */
  getTaxRegister(type: 'SALES' | 'PURCHASE', startDate: string, endDate: string): TaxRegisterReport {
    const isSales = type === 'SALES'
    const table = isSales ? 'sales_invoices' : 'purchase_invoices'
    const partyTable = isSales ? 'customers' : 'suppliers'
    const partyJoin = isSales ? 'customer_id' : 'supplier_id'

    const query = `
      SELECT
        t.id,
        t.invoice_number,
        t.invoice_date,
        p.name AS party_name,
        p.gst_no AS party_gstin,
        t.tax_mode,
        COALESCE(t.place_of_supply, '24') AS place_of_supply,
        t.taxable_amount,
        t.cgst_amount,
        t.sgst_amount,
        t.igst_amount,
        t.cess_amount,
        t.tax_amount,
        t.grand_total
      FROM ${table} t
      LEFT JOIN ${partyTable} p ON p.id = t.${partyJoin}
      WHERE t.deleted_at IS NULL AND t.invoice_date >= ? AND t.invoice_date <= ?
      ORDER BY t.invoice_date DESC, t.created_at DESC
    `
    const rows = this.db.prepare(query).all(startDate, endDate) as any[]

    let totalTaxable = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0
    let totalCess = 0
    let totalTax = 0
    let totalGrandTotal = 0

    const mappedRows: TaxRegisterRow[] = rows.map((r) => {
      const taxable = Number(r.taxable_amount || 0)
      const cgst = Number(r.cgst_amount || 0)
      const sgst = Number(r.sgst_amount || 0)
      const igst = Number(r.igst_amount || 0)
      const cess = Number(r.cess_amount || 0)
      const tax = Number(r.tax_amount || (cgst + sgst + igst + cess))
      const grand = Number(r.grand_total || 0)

      totalTaxable += taxable
      totalCgst += cgst
      totalSgst += sgst
      totalIgst += igst
      totalCess += cess
      totalTax += tax
      totalGrandTotal += grand

      return {
        id: r.id,
        invoiceNumber: r.invoice_number,
        invoiceDate: r.invoice_date,
        partyName: r.party_name || 'Counter Customer',
        partyGstin: r.party_gstin,
        taxMode: r.tax_mode || 'INTRA_STATE',
        placeOfSupply: r.place_of_supply,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        cessAmount: cess,
        totalTax: tax,
        grandTotal: grand
      }
    })

    return {
      startDate,
      endDate,
      rows: mappedRows,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalCess,
      totalTax,
      totalGrandTotal
    }
  }

  /**
   * Tax Dashboard Summary
   */
  getTaxDashboard(startDate: string, endDate: string): TaxDashboardReport {
    // 1. Output Tax (Sales)
    const salesTax = this.db
      .prepare(
        `
        SELECT
          SUM(taxable_amount) AS taxable,
          SUM(cgst_amount) AS cgst,
          SUM(sgst_amount) AS sgst,
          SUM(igst_amount) AS igst
        FROM sales_invoices
        WHERE deleted_at IS NULL AND invoice_date >= ? AND invoice_date <= ?
      `
      )
      .get(startDate, endDate) as any

    // 2. Input Tax (Purchases)
    const purchTax = this.db
      .prepare(
        `
        SELECT
          SUM(taxable_amount) AS taxable,
          SUM(cgst_amount) AS cgst,
          SUM(sgst_amount) AS sgst,
          SUM(igst_amount) AS igst
        FROM purchase_invoices
        WHERE deleted_at IS NULL AND is_itc_eligible = 1 AND invoice_date >= ? AND invoice_date <= ?
      `
      )
      .get(startDate, endDate) as any

    // 3. Sales Return Credit Notes Tax Reversed
    const sReturnTax = this.db
      .prepare(
        `
        SELECT SUM(tax_amount) AS total
        FROM return_transactions
        WHERE deleted_at IS NULL AND return_type = 'SALES_RETURN' AND return_date >= ? AND return_date <= ?
      `
      )
      .get(startDate, endDate) as any

    // 4. Purchase Return Debit Notes Tax Reversed
    const pReturnTax = this.db
      .prepare(
        `
        SELECT SUM(tax_amount) AS total
        FROM return_transactions
        WHERE deleted_at IS NULL AND return_type = 'PURCHASE_RETURN' AND return_date >= ? AND return_date <= ?
      `
      )
      .get(startDate, endDate) as any

    const outCgst = Number(salesTax?.cgst || 0)
    const outSgst = Number(salesTax?.sgst || 0)
    const outIgst = Number(salesTax?.igst || 0)
    const totalOut = outCgst + outSgst + outIgst

    const inCgst = Number(purchTax?.cgst || 0)
    const inSgst = Number(purchTax?.sgst || 0)
    const inIgst = Number(purchTax?.igst || 0)
    const totalIn = inCgst + inSgst + inIgst

    return {
      periodStart: startDate,
      periodEnd: endDate,
      outputCgst: outCgst,
      outputSgst: outSgst,
      outputIgst: outIgst,
      totalOutputTax: totalOut,
      inputCgst: inCgst,
      inputSgst: inSgst,
      inputIgst: inIgst,
      totalInputTax: totalIn,
      netPayableTax: Math.max(0, totalOut - totalIn),
      totalTaxableSales: Number(salesTax?.taxable || 0),
      totalTaxablePurchases: Number(purchTax?.taxable || 0),
      totalCreditNotesTaxReversed: Number(sReturnTax?.total || 0),
      totalDebitNotesTaxReversed: Number(pReturnTax?.total || 0)
    }
  }
}
