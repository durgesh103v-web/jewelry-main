import React, { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { DateRangeFilterBar } from '../../reports/components/DateRangeFilterBar'

type TaxTab =
  | 'DASHBOARD'
  | 'GSTR1'
  | 'GSTR3B'
  | 'HSN_SUMMARY'
  | 'SALES_TAX_REGISTER'
  | 'PURCHASE_TAX_REGISTER'
  | 'MASTERS'

interface TaxComplianceHubScreenProps {
  onClose?: () => void
  initialTab?: TaxTab
}

export const TaxComplianceHubScreen: React.FC<TaxComplianceHubScreenProps> = ({
  onClose,
  initialTab = 'DASHBOARD'
}) => {
  const [activeTab, setActiveTab] = useState<TaxTab>(initialTab)
  const [startDate, setStartDate] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Datasets
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [gstr1Data, setGstr1Data] = useState<any>(null)
  const [gstr3bData, setGstr3bData] = useState<any>(null)
  const [hsnSummaryData, setHsnSummaryData] = useState<any>(null)
  const [salesTaxRegData, setSalesTaxRegData] = useState<any>(null)
  const [purchTaxRegData, setPurchTaxRegData] = useState<any>(null)
  const [taxRates, setTaxRates] = useState<any[]>([])
  const [hsnCodes, setHsnCodes] = useState<any[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const payload = { startDate, endDate }

    try {
      if (activeTab === 'DASHBOARD') {
        const res = await window.api.tax.getTaxDashboard(payload)
        setDashboardData(res)
      } else if (activeTab === 'GSTR1') {
        const res = await window.api.tax.getGstr1Report(payload)
        setGstr1Data(res)
      } else if (activeTab === 'GSTR3B') {
        const res = await window.api.tax.getGstr3BReport(payload)
        setGstr3bData(res)
      } else if (activeTab === 'HSN_SUMMARY') {
        const res = await window.api.tax.getHsnSummaryReport(payload)
        setHsnSummaryData(res)
      } else if (activeTab === 'SALES_TAX_REGISTER') {
        const res = await window.api.tax.getTaxRegister({ type: 'SALES', ...payload })
        setSalesTaxRegData(res)
      } else if (activeTab === 'PURCHASE_TAX_REGISTER') {
        const res = await window.api.tax.getTaxRegister({ type: 'PURCHASE', ...payload })
        setPurchTaxRegData(res)
      } else if (activeTab === 'MASTERS') {
        const [r, h] = await Promise.all([window.api.tax.getTaxRates(), window.api.tax.getHsnCodes()])
        setTaxRates(r)
        setHsnCodes(h)
      }
    } catch (err: any) {
      console.error('Error fetching tax report:', err)
      setError(err.message || 'Failed to fetch tax compliance data')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Simple CSV Export helper
  const handleExportCsv = () => {
    let rows: any[] = []
    let filename = `tax_${activeTab.toLowerCase()}_${startDate}_to_${endDate}.csv`

    if (activeTab === 'GSTR1') rows = gstr1Data?.b2bInvoices || []
    else if (activeTab === 'HSN_SUMMARY') rows = hsnSummaryData?.items || []
    else if (activeTab === 'SALES_TAX_REGISTER') rows = salesTaxRegData?.rows || []
    else if (activeTab === 'PURCHASE_TAX_REGISTER') rows = purchTaxRegData?.rows || []
    else if (activeTab === 'MASTERS') rows = taxRates

    if (rows.length === 0) return

    const headers = Object.keys(rows[0]).join(',')
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows.map((e) => Object.values(e).map((val) => `"${val}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-13 px-4 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏛️</span>
          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight">
              GST & Tax Compliance Engine
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'DASHBOARD'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tax Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GSTR1')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'GSTR1'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            GSTR-1
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GSTR3B')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'GSTR3B'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            GSTR-3B
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HSN_SUMMARY')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'HSN_SUMMARY'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            HSN Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SALES_TAX_REGISTER')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'SALES_TAX_REGISTER'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sales Tax Register
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PURCHASE_TAX_REGISTER')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'PURCHASE_TAX_REGISTER'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Purchase Tax Register
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MASTERS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'MASTERS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tax Masters
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground rounded-lg"
          >
            ✕
          </button>
        )}
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {/* Filter Bar (hidden on masters tab) */}
        {activeTab !== 'MASTERS' && (
          <DateRangeFilterBar
            startDate={startDate}
            endDate={endDate}
            search={search}
            onDateChange={(s, e) => {
              setStartDate(s)
              setEndDate(e)
            }}
            onSearchChange={setSearch}
            onExportCsv={handleExportCsv}
            onPrint={() => window.print()}
            isLoading={isLoading}
          />
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Content Container */}
        <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm flex flex-col">
          {/* 1. Tax Dashboard */}
          {activeTab === 'DASHBOARD' && dashboardData && (
            <div className="p-6 max-w-4xl mx-auto space-y-6 text-xs w-full">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground font-semibold">Total Output GST (Sales)</div>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    ₹{dashboardData.totalOutputTax.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5">
                    <div>CGST: ₹{dashboardData.outputCgst.toLocaleString()}</div>
                    <div>SGST: ₹{dashboardData.outputSgst.toLocaleString()}</div>
                    <div>IGST: ₹{dashboardData.outputIgst.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground font-semibold">Total Input GST (ITC)</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{dashboardData.totalInputTax.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5">
                    <div>CGST: ₹{dashboardData.inputCgst.toLocaleString()}</div>
                    <div>SGST: ₹{dashboardData.inputSgst.toLocaleString()}</div>
                    <div>IGST: ₹{dashboardData.inputIgst.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground font-semibold">Net GST Position</div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    ₹{dashboardData.netPayableTax.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2">
                    {dashboardData.netPayableTax > 0 ? 'Net Tax Payable to Govt' : 'Excess ITC Carried Forward'}
                  </div>
                </div>
              </div>

              {/* Tax Turnover Breakdown */}
              <div className="border border-border p-4 rounded-xl space-y-3 bg-card">
                <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
                  Taxable Turnover & Adjustments
                </h3>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Taxable Sales Turnover:</span>
                  <span className="font-mono font-bold">₹{dashboardData.totalTaxableSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Taxable Purchases (Inward Supplies):</span>
                  <span className="font-mono font-bold">₹{dashboardData.totalTaxablePurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                  <span>Sales Return Credit Notes (Tax Reversed):</span>
                  <span className="font-mono font-bold">-₹{dashboardData.totalCreditNotesTaxReversed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                  <span>Purchase Return Debit Notes (Tax Reversed):</span>
                  <span className="font-mono font-bold">-₹{dashboardData.totalDebitNotesTaxReversed.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. GSTR-1 View */}
          {activeTab === 'GSTR1' && gstr1Data && (
            <div className="p-4 space-y-6">
              {/* B2B Table */}
              <div>
                <h3 className="font-bold text-xs uppercase text-primary mb-2">
                  4A, 4B, 4C, 6B, 6C - B2B Invoices (Registered Customers)
                </h3>
                <table className="w-full text-left text-xs border-collapse border border-border">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px]">
                    <tr>
                      <th className="py-2 px-3 border border-border">GSTIN</th>
                      <th className="py-2 px-3 border border-border">Customer</th>
                      <th className="py-2 px-3 border border-border">Invoice No</th>
                      <th className="py-2 px-3 border border-border">Date</th>
                      <th className="py-2 px-3 border border-border text-right">Taxable (₹)</th>
                      <th className="py-2 px-3 border border-border text-right">CGST (₹)</th>
                      <th className="py-2 px-3 border border-border text-right">SGST (₹)</th>
                      <th className="py-2 px-3 border border-border text-right">IGST (₹)</th>
                      <th className="py-2 px-3 border border-border text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gstr1Data.b2bInvoices || []).map((b: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-1.5 px-3 border border-border font-mono">{b.gstin}</td>
                        <td className="py-1.5 px-3 border border-border font-semibold">{b.customerName}</td>
                        <td className="py-1.5 px-3 border border-border font-mono">{b.invoiceNumber}</td>
                        <td className="py-1.5 px-3 border border-border font-mono">{b.invoiceDate}</td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono font-medium">
                          ₹{b.taxableValue.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono">₹{b.cgstAmount.toLocaleString()}</td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono">₹{b.sgstAmount.toLocaleString()}</td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono">₹{b.igstAmount.toLocaleString()}</td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono font-bold">
                          ₹{b.invoiceValue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {gstr1Data.b2bInvoices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-3 text-center text-muted-foreground">
                          No B2B Invoices found in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* B2CS Table */}
              <div>
                <h3 className="font-bold text-xs uppercase text-primary mb-2">
                  7 - B2C Small Invoices (Unregistered Customers Summary)
                </h3>
                <table className="w-full text-left text-xs border-collapse border border-border">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px]">
                    <tr>
                      <th className="py-2 px-3 border border-border">Place of Supply</th>
                      <th className="py-2 px-3 border border-border text-center">Rate (%)</th>
                      <th className="py-2 px-3 border border-border text-right">Taxable Value (₹)</th>
                      <th className="py-2 px-3 border border-border text-right">Central Tax (₹)</th>
                      <th className="py-2 px-3 border border-border text-right">State Tax (₹)</th>
                      <th className="py-2 px-3 border border-border text-right">Integrated Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gstr1Data.b2cSummaries || []).map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-1.5 px-3 border border-border font-mono">{c.placeOfSupply}</td>
                        <td className="py-1.5 px-3 border border-border text-center font-mono">{c.taxRate}%</td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono font-bold">
                          ₹{c.taxableValue.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono">₹{c.cgstAmount.toLocaleString()}</td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono">₹{c.sgstAmount.toLocaleString()}</td>
                        <td className="py-1.5 px-3 border border-border text-right font-mono">₹{c.igstAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. GSTR-3B Summary View */}
          {activeTab === 'GSTR3B' && gstr3bData && (
            <div className="p-6 max-w-4xl mx-auto space-y-6 text-xs w-full">
              <h2 className="text-sm font-bold text-foreground text-center border-b border-border pb-2">
                GSTR-3B Return Summary ({gstr3bData.startDate} to {gstr3bData.endDate})
              </h2>

              {/* 3.1 Outward supplies */}
              <div className="border border-border p-4 rounded-xl space-y-2 bg-card">
                <h3 className="font-bold text-primary uppercase text-[11px]">
                  3.1 Details of Outward Supplies & Inward Supplies liable to Reverse Charge
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-1.5 px-2">Nature of Supplies</th>
                      <th className="py-1.5 px-2 text-right">Taxable (₹)</th>
                      <th className="py-1.5 px-2 text-right">IGST (₹)</th>
                      <th className="py-1.5 px-2 text-right">CGST (₹)</th>
                      <th className="py-1.5 px-2 text-right">SGST (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border/40">
                      <td className="py-1.5 px-2">{gstr3bData.outwardTaxableSupplies.natureOfSupplies}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">
                        ₹{gstr3bData.outwardTaxableSupplies.totalTaxableValue.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        ₹{gstr3bData.outwardTaxableSupplies.integratedTax.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        ₹{gstr3bData.outwardTaxableSupplies.centralTax.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        ₹{gstr3bData.outwardTaxableSupplies.stateTax.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Eligible ITC */}
              <div className="border border-border p-4 rounded-xl space-y-2 bg-card">
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">
                  4. Eligible Input Tax Credit (ITC)
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-1.5 px-2">Details</th>
                      <th className="py-1.5 px-2 text-right">Taxable (₹)</th>
                      <th className="py-1.5 px-2 text-right">IGST (₹)</th>
                      <th className="py-1.5 px-2 text-right">CGST (₹)</th>
                      <th className="py-1.5 px-2 text-right">SGST (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border/40">
                      <td className="py-1.5 px-2">{gstr3bData.eligibleItc.allOtherItc.natureOfSupplies}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">
                        ₹{gstr3bData.eligibleItc.allOtherItc.totalTaxableValue.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        ₹{gstr3bData.eligibleItc.allOtherItc.integratedTax.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        ₹{gstr3bData.eligibleItc.allOtherItc.centralTax.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        ₹{gstr3bData.eligibleItc.allOtherItc.stateTax.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6.1 Net Tax Payable */}
              <div className="border border-border p-4 rounded-xl space-y-2 bg-card">
                <h3 className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[11px]">
                  6.1 Payment of Tax (Net Tax Payable)
                </h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <div className="text-muted-foreground text-[10px]">Integrated Tax (₹)</div>
                    <div className="font-mono font-bold mt-1">₹{gstr3bData.netTaxPayable.integratedTax.toLocaleString()}</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <div className="text-muted-foreground text-[10px]">Central Tax (₹)</div>
                    <div className="font-mono font-bold mt-1">₹{gstr3bData.netTaxPayable.centralTax.toLocaleString()}</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <div className="text-muted-foreground text-[10px]">State Tax (₹)</div>
                    <div className="font-mono font-bold mt-1">₹{gstr3bData.netTaxPayable.stateTax.toLocaleString()}</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <div className="text-muted-foreground text-[10px]">Total Tax Payable (₹)</div>
                    <div className="font-mono font-bold text-primary mt-1">
                      ₹{gstr3bData.netTaxPayable.totalPayable.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. HSN Summary */}
          {activeTab === 'HSN_SUMMARY' && hsnSummaryData && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">HSN Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-2 text-center">UOM</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Gross (g)</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                  <th className="py-2.5 px-3 text-right">Central Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right">State Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right">Integrated Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(hsnSummaryData.items || []).map((h: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{h.hsnCode}</td>
                    <td className="py-2 px-3 text-muted-foreground">{h.description}</td>
                    <td className="py-2 px-2 text-center font-mono">{h.uom}</td>
                    <td className="py-2 px-2 text-center font-mono">{h.totalQuantity}</td>
                    <td className="py-2 px-2 text-right font-mono">{h.totalGrossWeight.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      ₹{h.taxableValue.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{h.centralTax.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{h.stateTax.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{h.integratedTax.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                      ₹{h.totalValue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 5. Sales & Purchase Tax Registers */}
          {(activeTab === 'SALES_TAX_REGISTER' || activeTab === 'PURCHASE_TAX_REGISTER') && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Party Name</th>
                  <th className="py-2.5 px-3">GSTIN</th>
                  <th className="py-2.5 px-2 text-center">Mode</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(
                  (activeTab === 'SALES_TAX_REGISTER' ? salesTaxRegData?.rows : purchTaxRegData?.rows) || []
                ).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.invoiceNumber}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{r.invoiceDate}</td>
                    <td className="py-2 px-3 font-semibold">{r.partyName}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{r.partyGstin || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-muted text-muted-foreground">
                        {r.taxMode}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium">₹{r.taxableAmount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{r.cgstAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{r.sgstAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{r.igstAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                      ₹{r.totalTax.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      ₹{r.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 6. Tax Masters (Rates & HSN) */}
          {activeTab === 'MASTERS' && (
            <div className="p-6 grid grid-cols-2 gap-6 text-xs">
              {/* Tax Rates Master */}
              <div className="border border-border p-4 rounded-xl space-y-3 bg-card">
                <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
                  Configured GST Tax Rates
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-1.5 px-2">Code</th>
                      <th className="py-1.5 px-2">Name</th>
                      <th className="py-1.5 px-2 text-right">IGST</th>
                      <th className="py-1.5 px-2 text-right">CGST</th>
                      <th className="py-1.5 px-2 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRates.map((tr) => (
                      <tr key={tr.id} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-mono font-bold">{tr.code}</td>
                        <td className="py-1.5 px-2">{tr.name}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{tr.igstRate}%</td>
                        <td className="py-1.5 px-2 text-right font-mono">{tr.cgstRate}%</td>
                        <td className="py-1.5 px-2 text-right font-mono">{tr.sgstRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HSN Codes Master */}
              <div className="border border-border p-4 rounded-xl space-y-3 bg-card">
                <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
                  Jewellery HSN & SAC Catalogue
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-1.5 px-2">HSN / SAC</th>
                      <th className="py-1.5 px-2">Description</th>
                      <th className="py-1.5 px-2 text-right">Default Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hsnCodes.map((h) => (
                      <tr key={h.id} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-mono font-bold">{h.hsnCode}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{h.description}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{h.defaultGstRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaxComplianceHubScreen
