import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { formatAmount } from '../../../utils/formatters'
import {
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiX,
  FiArrowRight,
  FiFileText,
  FiPieChart,
  FiBarChart2,
  FiGrid,
  FiSliders
} from 'react-icons/fi'

interface TaxComplianceHubScreenProps {
  onClose?: () => void
  initialTab?: TaxTab
}

type TaxTab =
  | 'DASHBOARD'
  | 'GSTR1'
  | 'GSTR3B'
  | 'HSN_SUMMARY'
  | 'SALES_TAX_REGISTER'
  | 'PURCHASE_TAX_REGISTER'
  | 'MASTERS'


export const TaxComplianceHubScreen: React.FC<TaxComplianceHubScreenProps> = ({
  onClose,
  initialTab = 'DASHBOARD'
}) => {
  const [activeTab, setActiveTab] = useState<TaxTab>(initialTab)
  const [activePreset, setActivePreset] = useState<string>('THIS_MONTH')
  const [startDate, setStartDate] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  // Report Data States
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
    const filter = { startDate, endDate }

    try {
      if (activeTab === 'DASHBOARD') {
        const res = await window.api.tax.getTaxDashboard(filter)
        setDashboardData(res)
      } else if (activeTab === 'GSTR1') {
        const res = await window.api.tax.getGstr1Report(filter)
        setGstr1Data(res)
      } else if (activeTab === 'GSTR3B') {
        const res = await window.api.tax.getGstr3BReport(filter)
        setGstr3bData(res)
      } else if (activeTab === 'HSN_SUMMARY') {
        const res = await window.api.tax.getHsnSummaryReport(filter)
        setHsnSummaryData(res)
      } else if (activeTab === 'SALES_TAX_REGISTER') {
        const res = await window.api.tax.getTaxRegister({ ...filter, type: 'SALES' })
        setSalesTaxRegData(res)
      } else if (activeTab === 'PURCHASE_TAX_REGISTER') {
        const res = await window.api.tax.getTaxRegister({ ...filter, type: 'PURCHASE' })
        setPurchTaxRegData(res)
      } else if (activeTab === 'MASTERS') {
        const [rates, hsn] = await Promise.all([
          window.api.tax.getTaxRates(),
          window.api.tax.getHsnCodes()
        ])
        setTaxRates(rates || [])
        setHsnCodes(hsn || [])
      }
    } catch (err: any) {
      console.error('Error fetching tax data:', err)
      setError(err.message || 'Failed to fetch tax return data')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, startDate, endDate])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const setPreset = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY') => {
    setActivePreset(preset)
    const today = dayjs()
    if (preset === 'TODAY') {
      const d = today.format('YYYY-MM-DD')
      setStartDate(d)
      setEndDate(d)
    } else if (preset === 'YESTERDAY') {
      const d = today.subtract(1, 'day').format('YYYY-MM-DD')
      setStartDate(d)
      setEndDate(d)
    } else if (preset === 'THIS_WEEK') {
      setStartDate(today.startOf('week').format('YYYY-MM-DD'))
      setEndDate(today.endOf('week').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_MONTH') {
      setStartDate(today.startOf('month').format('YYYY-MM-DD'))
      setEndDate(today.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_FY') {
      const currentYear = today.month() >= 3 ? today.year() : today.year() - 1
      setStartDate(`${currentYear}-04-01`)
      setEndDate(`${currentYear + 1}-03-31`)
    }
  }


  // Filtered Register Rows
  const filteredSalesRows = useMemo(() => {
    if (!salesTaxRegData?.rows) return []
    if (!search.trim()) return salesTaxRegData.rows
    const q = search.trim().toLowerCase()
    return salesTaxRegData.rows.filter(
      (r: any) =>
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        (r.partyGstin || '').toLowerCase().includes(q)
    )
  }, [salesTaxRegData, search])

  const filteredPurchRows = useMemo(() => {
    if (!purchTaxRegData?.rows) return []
    if (!search.trim()) return purchTaxRegData.rows
    const q = search.trim().toLowerCase()
    return purchTaxRegData.rows.filter(
      (r: any) =>
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        (r.partyGstin || '').toLowerCase().includes(q)
    )
  }, [purchTaxRegData, search])

  // Summary of Filtered Sales Rows
  const salesTotals = useMemo(() => {
    return filteredSalesRows.reduce(
      (acc: any, r: any) => {
        acc.taxable += Number(r.taxableAmount || 0)
        acc.cgst += Number(r.cgstAmount || 0)
        acc.sgst += Number(r.sgstAmount || 0)
        acc.igst += Number(r.igstAmount || 0)
        acc.totalTax += Number(r.totalTax || 0)
        acc.grandTotal += Number(r.grandTotal || 0)
        return acc
      },
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, grandTotal: 0 }
    )
  }, [filteredSalesRows])

  // Summary of Filtered Purchase Rows
  const purchTotals = useMemo(() => {
    return filteredPurchRows.reduce(
      (acc: any, r: any) => {
        acc.taxable += Number(r.taxableAmount || 0)
        acc.cgst += Number(r.cgstAmount || 0)
        acc.sgst += Number(r.sgstAmount || 0)
        acc.igst += Number(r.igstAmount || 0)
        acc.totalTax += Number(r.totalTax || 0)
        acc.grandTotal += Number(r.grandTotal || 0)
        return acc
      },
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, grandTotal: 0 }
    )
  }, [filteredPurchRows])

  // HSN Totals
  const hsnTotals = useMemo(() => {
    if (!hsnSummaryData?.items) return { qty: 0, gross: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    return hsnSummaryData.items.reduce(
      (acc: any, i: any) => {
        acc.qty += Number(i.totalQuantity || 0)
        acc.gross += Number(i.totalGrossWeight || 0)
        acc.taxable += Number(i.taxableValue || 0)
        acc.cgst += Number(i.centralTax || 0)
        acc.sgst += Number(i.stateTax || 0)
        acc.igst += Number(i.integratedTax || 0)
        acc.total += Number(i.totalValue || 0)
        return acc
      },
      { qty: 0, gross: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    )
  }, [hsnSummaryData])

  // CSV Export Helpers
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val)
    return `"${str.replace(/"/g, '""')}"`
  }

  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setNotice({ type: 'success', message: `Exported ${filename} successfully.` })
  }

  const handleExportCsv = () => {
    if (activeTab === 'DASHBOARD') {
      if (!dashboardData) {
        setNotice({ type: 'info', message: 'Dashboard data is still loading or unavailable.' })
        return
      }
      const filename = `gst_dashboard_summary_${startDate}_to_${endDate}.csv`
      const netAmount =
        dashboardData.netPayableTax > 0
          ? dashboardData.netPayableTax
          : Math.abs(Number(dashboardData.totalInputTax || 0) - Number(dashboardData.totalOutputTax || 0))
      const offsetStatus =
        dashboardData.netPayableTax > 0 ? 'Net Tax Payable via Challan PMT-06' : 'Excess ITC Carried Forward'

      const lines: string[] = [
        `"GST & Tax Compliance Dashboard Summary"`,
        `"Tax Period: ${startDate} to ${endDate}"`,
        `""`,
        `"Section","Metric","Amount (INR)"`,
        `"Output Tax (Sales)","Total Output GST",${dashboardData.totalOutputTax ?? 0}`,
        `"Output Tax (Sales)","CGST (1.5%)",${dashboardData.outputCgst ?? 0}`,
        `"Output Tax (Sales)","SGST (1.5%)",${dashboardData.outputSgst ?? 0}`,
        `"Output Tax (Sales)","IGST (3.0%)",${dashboardData.outputIgst ?? 0}`,
        `"Output Tax (Sales)","Taxable Sales Turnover",${dashboardData.totalTaxableSales ?? 0}`,
        `"Input Tax Credit (ITC)","Total Input Tax Credit (ITC)",${dashboardData.totalInputTax ?? 0}`,
        `"Input Tax Credit (ITC)","CGST ITC",${dashboardData.inputCgst ?? 0}`,
        `"Input Tax Credit (ITC)","SGST ITC",${dashboardData.inputSgst ?? 0}`,
        `"Input Tax Credit (ITC)","IGST ITC",${dashboardData.inputIgst ?? 0}`,
        `"Input Tax Credit (ITC)","Taxable Purchases Turnover",${dashboardData.totalTaxablePurchases ?? 0}`,
        `"Net GST Position","Net Position Amount",${netAmount}`,
        `"Net GST Position","Offset Status",${escapeCsv(offsetStatus)}`,
        `"Turnover & Adjustments","Total Taxable Sales Turnover",${dashboardData.totalTaxableSales ?? 0}`,
        `"Turnover & Adjustments","Total Taxable Purchases (Inward)",${dashboardData.totalTaxablePurchases ?? 0}`,
        `"Turnover & Adjustments","Sales Return Credit Notes (Tax Reversed)",${dashboardData.totalCreditNotesTaxReversed ?? 0}`,
        `"Turnover & Adjustments","Purchase Return Debit Notes (Tax Reversed)",${dashboardData.totalDebitNotesTaxReversed ?? 0}`,
        `"Turnover & Adjustments","Net Taxable Turnover",${
          Number(dashboardData.totalTaxableSales || 0) - Number(dashboardData.totalCreditNotesTaxReversed || 0)
        }`
      ]
      downloadCsv(filename, lines.join('\n'))
      return
    }

    if (activeTab === 'GSTR1') {
      const b2b = gstr1Data?.b2bInvoices || []
      const b2c = gstr1Data?.b2cSummaries || []
      if (b2b.length === 0 && b2c.length === 0) {
        setNotice({ type: 'info', message: 'No GSTR-1 records found for this period.' })
        return
      }
      const filename = `gstr1_report_${startDate}_to_${endDate}.csv`
      const lines: string[] = [
        `"GSTR-1 Outward Supplies Return"`,
        `"Tax Period: ${startDate} to ${endDate}"`,
        `""`,
        `"TABLE 4: B2B INVOICES (SUPPLIES TO REGISTERED DEALERS)"`,
        `"GSTIN","Customer Name","Invoice No","Date","Taxable Value (INR)","CGST (INR)","SGST (INR)","IGST (INR)","Invoice Value (INR)"`
      ]
      if (b2b.length > 0) {
        b2b.forEach((b: any) => {
          lines.push([
            escapeCsv(b.gstin),
            escapeCsv(b.customerName),
            escapeCsv(b.invoiceNumber),
            escapeCsv(b.invoiceDate),
            b.taxableValue ?? 0,
            b.cgstAmount ?? 0,
            b.sgstAmount ?? 0,
            b.igstAmount ?? 0,
            b.invoiceValue ?? 0
          ].join(','))
        })
      } else {
        lines.push(`"No B2B Invoices with GSTIN recorded in this period."`)
      }
      lines.push(`""`)
      lines.push(`"TABLE 7: B2C SMALL INVOICES (RETAIL COUNTER SALES SUMMARY)"`)
      lines.push(`"Place of Supply","Tax Rate (%)","Taxable Value (INR)","CGST (INR)","SGST (INR)","IGST (INR)","Total Tax (INR)"`)
      if (b2c.length > 0) {
        b2c.forEach((c: any) => {
          const rowTax = Number(c.cgstAmount || 0) + Number(c.sgstAmount || 0) + Number(c.igstAmount || 0)
          lines.push([
            escapeCsv(`State Code: ${c.placeOfSupply}`),
            c.taxRate ?? 0,
            c.taxableValue ?? 0,
            c.cgstAmount ?? 0,
            c.sgstAmount ?? 0,
            c.igstAmount ?? 0,
            rowTax
          ].join(','))
        })
      } else {
        lines.push(`"No retail B2C counter sales found in this period."`)
      }
      downloadCsv(filename, lines.join('\n'))
      return
    }

    if (activeTab === 'GSTR3B') {
      if (!gstr3bData) {
        setNotice({ type: 'info', message: 'No GSTR-3B data available for this period.' })
        return
      }
      const filename = `gstr3b_summary_${startDate}_to_${endDate}.csv`
      const lines: string[] = [
        `"GSTR-3B Statutory Return Summary"`,
        `"Tax Period: ${startDate} to ${endDate}"`,
        `""`,
        `"3.1 DETAILS OF OUTWARD SUPPLIES"`,
        `"Nature of Supplies","Total Taxable Value (INR)","Integrated Tax (INR)","Central Tax (INR)","State/UT Tax (INR)"`,
        [
          escapeCsv(gstr3bData.outwardTaxableSupplies?.natureOfSupplies || 'Outward taxable supplies'),
          gstr3bData.outwardTaxableSupplies?.totalTaxableValue ?? 0,
          gstr3bData.outwardTaxableSupplies?.integratedTax ?? 0,
          gstr3bData.outwardTaxableSupplies?.centralTax ?? 0,
          gstr3bData.outwardTaxableSupplies?.stateTax ?? 0
        ].join(','),
        `""`,
        `"4.0 ELIGIBLE INPUT TAX CREDIT (ITC)"`,
        `"Details","Total Taxable (INR)","Integrated Tax (INR)","Central Tax (INR)","State/UT Tax (INR)"`,
        [
          escapeCsv(gstr3bData.eligibleItc?.allOtherItc?.natureOfSupplies || 'All other ITC'),
          gstr3bData.eligibleItc?.allOtherItc?.totalTaxableValue ?? 0,
          gstr3bData.eligibleItc?.allOtherItc?.integratedTax ?? 0,
          gstr3bData.eligibleItc?.allOtherItc?.centralTax ?? 0,
          gstr3bData.eligibleItc?.allOtherItc?.stateTax ?? 0
        ].join(','),
        `""`,
        `"6.1 PAYMENT OF TAX (NET TAX PAYABLE)"`,
        `"Tax Component","Amount Payable (INR)"`,
        `"Integrated Tax",${gstr3bData.netTaxPayable?.integratedTax ?? 0}`,
        `"Central Tax",${gstr3bData.netTaxPayable?.centralTax ?? 0}`,
        `"State/UT Tax",${gstr3bData.netTaxPayable?.stateTax ?? 0}`,
        `"Total Net Payable",${gstr3bData.netTaxPayable?.totalPayable ?? 0}`
      ]
      downloadCsv(filename, lines.join('\n'))
      return
    }

    if (activeTab === 'HSN_SUMMARY') {
      const items = hsnSummaryData?.items || []
      if (items.length === 0) {
        setNotice({ type: 'info', message: 'No HSN records found for this period.' })
        return
      }
      const filename = `hsn_summary_${startDate}_to_${endDate}.csv`
      const lines: string[] = [
        `"HSN Summary Report"`,
        `"Tax Period: ${startDate} to ${endDate}"`,
        `""`,
        `"HSN Code","Description","UOM","Quantity","Gross Weight (g)","Taxable Value (INR)","CGST (INR)","SGST (INR)","IGST (INR)","Total Value (INR)"`
      ]
      items.forEach((h: any) => {
        lines.push([
          escapeCsv(h.hsnCode),
          escapeCsv(h.description),
          escapeCsv(h.uom),
          h.totalQuantity ?? 0,
          Number(h.totalGrossWeight || 0).toFixed(3),
          h.taxableValue ?? 0,
          h.centralTax ?? 0,
          h.stateTax ?? 0,
          h.integratedTax ?? 0,
          h.totalValue ?? 0
        ].join(','))
      })
      lines.push([
        `"TOTAL"`,
        `""`,
        `""`,
        hsnTotals.qty,
        hsnTotals.gross.toFixed(3),
        hsnTotals.taxable,
        hsnTotals.cgst,
        hsnTotals.sgst,
        hsnTotals.igst,
        hsnTotals.total
      ].join(','))
      downloadCsv(filename, lines.join('\n'))
      return
    }

    if (activeTab === 'SALES_TAX_REGISTER' || activeTab === 'PURCHASE_TAX_REGISTER') {
      const isSales = activeTab === 'SALES_TAX_REGISTER'
      const rows = isSales ? filteredSalesRows : filteredPurchRows
      if (rows.length === 0) {
        setNotice({
          type: 'info',
          message: `No ${isSales ? 'sales' : 'purchase'} tax records found matching criteria.`
        })
        return
      }
      const filename = `${isSales ? 'sales' : 'purchase'}_tax_register_${startDate}_to_${endDate}.csv`
      const lines: string[] = [
        `"${isSales ? 'Sales' : 'Purchase'} Tax Register"`,
        `"Tax Period: ${startDate} to ${endDate}"`,
        `""`,
        `"Invoice No","Date","Party Name","GSTIN","Tax Mode","Taxable Amount (INR)","CGST (INR)","SGST (INR)","IGST (INR)","Total Tax (INR)","Grand Total (INR)"`
      ]
      rows.forEach((r: any) => {
        lines.push([
          escapeCsv(r.invoiceNumber),
          escapeCsv(r.invoiceDate),
          escapeCsv(r.partyName),
          escapeCsv(r.partyGstin || '-'),
          escapeCsv(r.taxMode || 'INTRA_STATE'),
          r.taxableAmount ?? 0,
          r.cgstAmount ?? 0,
          r.sgstAmount ?? 0,
          r.igstAmount ?? 0,
          r.totalTax ?? 0,
          r.grandTotal ?? 0
        ].join(','))
      })
      const totals = isSales ? salesTotals : purchTotals
      lines.push([
        `"TOTAL"`,
        `""`,
        `""`,
        `""`,
        `""`,
        totals.taxable,
        totals.cgst,
        totals.sgst,
        totals.igst,
        totals.totalTax,
        totals.grandTotal
      ].join(','))
      downloadCsv(filename, lines.join('\n'))
      return
    }

    if (activeTab === 'MASTERS') {
      if (taxRates.length === 0 && hsnCodes.length === 0) {
        setNotice({ type: 'info', message: 'No tax master records available to export.' })
        return
      }
      const filename = `tax_masters.csv`
      const lines: string[] = [
        `"Statutory GST Tax Rates"`,
        `"Rate Name","Tax Rate (%)","CGST (%)","SGST (%)","IGST (%)","Type","Status"`
      ]
      if (taxRates.length > 0) {
        taxRates.forEach((r: any) => {
          lines.push([
            escapeCsv(r.name),
            r.rate ?? 0,
            r.cgstRate ?? 0,
            r.sgstRate ?? 0,
            r.igstRate ?? 0,
            escapeCsv(r.type || ''),
            escapeCsv(r.active ? 'Active' : 'Inactive')
          ].join(','))
        })
      } else {
        lines.push(`"No tax rates configured."`)
      }
      lines.push(`""`)
      lines.push(`"HSN Code Catalogue"`)
      lines.push(`"HSN Code","Description","GST Rate (%)"`)
      if (hsnCodes.length > 0) {
        hsnCodes.forEach((h: any) => {
          lines.push([
            escapeCsv(h.code),
            escapeCsv(h.description),
            h.taxRate ?? 0
          ].join(','))
        })
      } else {
        lines.push(`"No HSN codes configured."`)
      }
      downloadCsv(filename, lines.join('\n'))
      return
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">
                GST & Tax Compliance Engine
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                GSTIN: 24AAACS1234F1Z1
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Regular Dealer
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Statutory returns (GSTR-1, GSTR-3B), HSN summary, and automated tax registers
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
            title="Close Tab"
          >
            ✕
          </button>
        )}
      </header>

      {/* ── DEDICATED SUB-NAVIGATION TAB BAR ── */}
      <div className="px-4 py-2 bg-white border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'DASHBOARD'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-bold border-amber-600'
              : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent'
          }`}
        >
          <FiBarChart2 size={13} />
          <span>Tax Dashboard</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('GSTR1')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'GSTR1'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-bold border-amber-600'
              : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent'
          }`}
        >
          <FiFileText size={13} />
          <span>GSTR-1</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('GSTR3B')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'GSTR3B'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-bold border-amber-600'
              : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent'
          }`}
        >
          <FiPieChart size={13} />
          <span>GSTR-3B</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HSN_SUMMARY')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'HSN_SUMMARY'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-bold border-amber-600'
              : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent'
          }`}
        >
          <FiGrid size={13} />
          <span>HSN Summary</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SALES_TAX_REGISTER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'SALES_TAX_REGISTER'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-bold border-amber-600'
              : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent'
          }`}
        >
          <FiFileText size={13} />
          <span>Sales Tax Register</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PURCHASE_TAX_REGISTER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'PURCHASE_TAX_REGISTER'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-bold border-amber-600'
              : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent'
          }`}
        >
          <FiFileText size={13} />
          <span>Purchase Tax Register</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('MASTERS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'MASTERS'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-bold border-amber-600'
              : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent'
          }`}
        >
          <FiSliders size={13} />
          <span>Tax Masters</span>
        </button>
      </div>

      {/* ── WORKSPACE CONTENT ── */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Date Filter & Search Toolbar */}
        {activeTab !== 'MASTERS' && (
          <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
            {/* Quick Date Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_FY'] as const).map((preset) => {
                const isSelected = activePreset === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPreset(preset)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-2xs font-bold border-amber-600'
                        : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent font-medium'
                    }`}
                  >
                    {preset === 'TODAY'
                      ? 'Today'
                      : preset === 'YESTERDAY'
                        ? 'Yesterday'
                        : preset === 'THIS_WEEK'
                          ? 'This Week'
                          : preset === 'THIS_MONTH'
                            ? 'This Month'
                            : 'This FY'}
                  </button>
                )
              })}
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setActivePreset('')
                }}
                className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
              />
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setActivePreset('')
                }}
                className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
              />
            </div>

            {/* Search Box and Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {isLoading && (
                <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                  Updating...
                </span>
              )}

              {activeTab !== 'DASHBOARD' && (
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by party, bill no..."
                    className="w-52 h-8 pl-7 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                  <FiSearch size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <FiX size={13} />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={isLoading}
                className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-amber-900 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50 active:scale-95"
                title="Refresh Data"
              >
                <FiRefreshCw size={13} className={isLoading ? 'animate-spin text-amber-600' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="h-8 px-3.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 border border-amber-600 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                title="Export to CSV"
              >
                <FiDownload size={13} />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-amber-900 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                title="Print Report"
              >
                <FiPrinter size={13} className="text-slate-600" />
                <span>Print</span>
              </button>
            </div>
          </div>
        )}

        {notice && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notice.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <span>{notice.type === 'success' ? '✅' : notice.type === 'info' ? 'ℹ️' : '⚠️'}</span>
              <span>{notice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Tab Content Panes */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col relative">
          {isLoading && !dashboardData && (
            <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                Loading tax data...
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              1. TAX DASHBOARD VIEW
              ══════════════════════════════════════════════ */}
          {activeTab === 'DASHBOARD' && dashboardData && (
            <div className="p-4 space-y-4 text-xs w-full overflow-y-auto">
              {/* Executive KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Output Tax Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Output GST (Sales)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Outward Tax
                      </span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums mt-1.5">
                      ₹{formatAmount(dashboardData.totalOutputTax)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>CGST (1.5%):</span>
                      <span className="font-semibold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.outputCgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>SGST (1.5%):</span>
                      <span className="font-semibold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.outputSgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>IGST (3.0%):</span>
                      <span className="font-semibold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.outputIgst)}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Taxable Sales Turnover:</span>
                    <span className="font-bold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.totalTaxableSales)}</span>
                  </div>
                </div>

                {/* 2. Input Tax Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Input Tax Credit (ITC)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Inward ITC
                      </span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums mt-1.5">
                      ₹{formatAmount(dashboardData.totalInputTax)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>CGST ITC:</span>
                      <span className="font-semibold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.inputCgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>SGST ITC:</span>
                      <span className="font-semibold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.inputSgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>IGST ITC:</span>
                      <span className="font-semibold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.inputIgst)}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Taxable Purchases Turnover:</span>
                    <span className="font-bold text-slate-800 tabular-nums">₹{formatAmount(dashboardData.totalTaxablePurchases)}</span>
                  </div>
                </div>

                {/* 3. Net GST Position Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Net GST Position
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Balance Offset
                      </span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums mt-1.5">
                      ₹
                      {formatAmount(
                        dashboardData.netPayableTax > 0
                          ? dashboardData.netPayableTax
                          : Math.abs(dashboardData.totalInputTax - dashboardData.totalOutputTax)
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-2">
                    <div>
                      {dashboardData.netPayableTax > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                          ⚠️ Net Tax Payable via Challan PMT-06
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          ✓ Excess ITC Carried Forward to Next Period
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Output Tax (₹{formatAmount(dashboardData.totalOutputTax)}) − Input ITC (₹{formatAmount(dashboardData.totalInputTax)})
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Offset Status:</span>
                    <span className="font-semibold text-slate-800">
                      {dashboardData.netPayableTax > 0 ? 'Cash Liability Due' : 'ITC Covered'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Column Split: Turnover Adjustments & Compliance Deadlines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Taxable Turnover & Adjustments */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                      Taxable Turnover & Adjustments
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">Sec 15 CGST Act</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Total Taxable Sales Turnover:</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        ₹{formatAmount(dashboardData.totalTaxableSales)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Total Taxable Purchases (Inward):</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        ₹{formatAmount(dashboardData.totalTaxablePurchases)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>Sales Return Credit Notes (Tax Reversed):</span>
                      <span className="font-medium tabular-nums">
                        -₹{formatAmount(dashboardData.totalCreditNotesTaxReversed)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                      <span>Purchase Return Debit Notes (Tax Reversed):</span>
                      <span className="font-medium tabular-nums">
                        -₹{formatAmount(dashboardData.totalDebitNotesTaxReversed)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-slate-900 text-sm">
                      <span>Net Taxable Turnover:</span>
                      <span className="tabular-nums text-slate-900">
                        ₹{formatAmount(dashboardData.totalTaxableSales - dashboardData.totalCreditNotesTaxReversed)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GST Filing Calendar & Compliance Deadlines */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                      Compliance Timeline & Status
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Active FY 2026-27
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">GSTR-1 (Outward Invoices)</div>
                        <div className="text-[10px] text-slate-500">Monthly return due by 11th of every month</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Ready to File
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">GSTR-3B (Summary & Tax Offset)</div>
                        <div className="text-[10px] text-slate-500">Monthly tax offset due by 20th of every month</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        ITC Matched
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">GSTR-9 (Annual Audit Return)</div>
                        <div className="text-[10px] text-slate-500">Annual statutory return due by 31st December</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Compliant
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jewellery Tax Slab Matrix & Action Buttons */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Jewellery GST Rates Matrix
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    <strong>3% GST</strong> on Gold, Silver & Platinum Jewellery (1.5% CGST + 1.5% SGST) •{' '}
                    <strong>0.25% GST</strong> on Cut Diamonds & Gemstones •{' '}
                    <strong>5% GST</strong> on Making Charges / Karigar Job Work
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('GSTR1')}
                    className="h-8 px-3 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 border border-amber-600 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                  >
                    <span>View GSTR-1</span>
                    <FiArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('GSTR3B')}
                    className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-amber-900 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <span>View GSTR-3B</span>
                    <FiArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              2. GSTR-1 RETURN VIEW
             ══════════════════════════════════════════════ */}
          {activeTab === 'GSTR1' && gstr1Data && (
            <div className="p-4 space-y-5 overflow-y-auto">
              {/* B2B Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                    Table 4 - B2B Invoices (Supplies made to Registered Dealers with GSTIN)
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Total: {gstr1Data.b2bInvoices?.length || 0} Invoices
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Invoice No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">Invoice Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(gstr1Data.b2bInvoices || []).map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 font-mono font-medium text-slate-700">{b.gstin}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{b.customerName}</td>
                          <td className="py-2 px-3 font-mono font-bold text-amber-900">{b.invoiceNumber}</td>
                          <td className="py-2 px-3 text-slate-600">{b.invoiceDate}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">
                            ₹{formatAmount(b.taxableValue)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                            ₹{formatAmount(b.cgstAmount)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                            ₹{formatAmount(b.sgstAmount)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                            ₹{formatAmount(b.igstAmount)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                            ₹{formatAmount(b.invoiceValue)}
                          </td>
                        </tr>
                      ))}
                      {(!gstr1Data.b2bInvoices || gstr1Data.b2bInvoices.length === 0) && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No B2B Invoices with GSTIN recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* B2CS Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                    Table 7 - B2C Small Invoices (Unregistered Retail Counter Sales Summary)
                  </h3>
                  <span className="text-[10px] text-slate-500">Grouped by Place of Supply & Tax Rate</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Place of Supply (State Code)</th>
                        <th className="py-2.5 px-3 text-center">Tax Rate</th>
                        <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                        <th className="py-2.5 px-3 text-right">Central Tax CGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">State Tax SGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">Integrated Tax IGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(gstr1Data.b2cSummaries || []).map((c: any, idx: number) => {
                        const rowTax = Number(c.cgstAmount || 0) + Number(c.sgstAmount || 0) + Number(c.igstAmount || 0)
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2 px-3 font-medium text-slate-800">
                              State Code: {c.placeOfSupply} (Gujarat / Intra-State)
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-amber-900">
                              {c.taxRate}%
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                              ₹{formatAmount(c.taxableValue)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                              ₹{formatAmount(c.cgstAmount)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                              ₹{formatAmount(c.sgstAmount)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                              ₹{formatAmount(c.igstAmount)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-800">
                              ₹{formatAmount(rowTax)}
                            </td>
                          </tr>
                        )
                      })}
                      {(!gstr1Data.b2cSummaries || gstr1Data.b2cSummaries.length === 0) && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No retail B2C counter sales found in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              3. GSTR-3B RETURN SUMMARY VIEW
             ══════════════════════════════════════════════ */}
          {activeTab === 'GSTR3B' && gstr3bData && (
            <div className="p-4 max-w-4xl mx-auto space-y-4 text-xs w-full overflow-y-auto">
              <div className="border-b border-slate-200 pb-2 text-center">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  GSTR-3B Statutory Return Summary
                </h2>
                <p className="text-[11px] text-slate-500">
                  Tax Period: {gstr3bData.startDate} to {gstr3bData.endDate}
                </p>
              </div>

              {/* 3.1 Outward supplies */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <h3 className="font-bold text-slate-800 uppercase text-[11px]">
                  3.1 Details of Outward Supplies and Inward Supplies liable to Reverse Charge
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Nature of Supplies</th>
                      <th className="py-2 px-2.5 text-right">Total Taxable Value (₹)</th>
                      <th className="py-2 px-2.5 text-right">Integrated Tax (₹)</th>
                      <th className="py-2 px-2.5 text-right">Central Tax (₹)</th>
                      <th className="py-2 px-2.5 text-right">State/UT Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="py-2 px-2.5 font-medium text-slate-800">
                        {gstr3bData.outwardTaxableSupplies.natureOfSupplies}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums font-bold text-slate-900">
                        ₹{formatAmount(gstr3bData.outwardTaxableSupplies.totalTaxableValue)}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                        ₹{formatAmount(gstr3bData.outwardTaxableSupplies.integratedTax)}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                        ₹{formatAmount(gstr3bData.outwardTaxableSupplies.centralTax)}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                        ₹{formatAmount(gstr3bData.outwardTaxableSupplies.stateTax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Eligible ITC */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <h3 className="font-bold text-slate-800 uppercase text-[11px]">
                  4.0 Eligible Input Tax Credit (ITC - Inward Supplies)
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Details</th>
                      <th className="py-2 px-2.5 text-right">Total Taxable (₹)</th>
                      <th className="py-2 px-2.5 text-right">Integrated Tax (₹)</th>
                      <th className="py-2 px-2.5 text-right">Central Tax (₹)</th>
                      <th className="py-2 px-2.5 text-right">State/UT Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="py-2 px-2.5 font-medium text-slate-800">
                        {gstr3bData.eligibleItc.allOtherItc.natureOfSupplies}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums font-bold text-slate-900">
                        ₹{formatAmount(gstr3bData.eligibleItc.allOtherItc.totalTaxableValue)}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                        ₹{formatAmount(gstr3bData.eligibleItc.allOtherItc.integratedTax)}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                        ₹{formatAmount(gstr3bData.eligibleItc.allOtherItc.centralTax)}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                        ₹{formatAmount(gstr3bData.eligibleItc.allOtherItc.stateTax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6.1 Payment of Tax */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h3 className="font-bold text-slate-800 uppercase text-[11px]">
                  6.1 Payment of Tax (Net Tax Payable via Electronic Cash Ledger)
                </h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Integrated Tax</div>
                    <div className="tabular-nums font-bold text-slate-900 text-sm mt-1">
                      ₹{formatAmount(gstr3bData.netTaxPayable.integratedTax)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Central Tax</div>
                    <div className="tabular-nums font-bold text-slate-900 text-sm mt-1">
                      ₹{formatAmount(gstr3bData.netTaxPayable.centralTax)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">State/UT Tax</div>
                    <div className="tabular-nums font-bold text-slate-900 text-sm mt-1">
                      ₹{formatAmount(gstr3bData.netTaxPayable.stateTax)}
                    </div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 shadow-2xs">
                    <div className="text-amber-900 text-[10px] uppercase font-bold">Total Net Payable</div>
                    <div className="tabular-nums font-bold text-amber-950 text-base mt-1">
                      ₹{formatAmount(gstr3bData.netTaxPayable.totalPayable)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              4. HSN SUMMARY VIEW
             ══════════════════════════════════════════════ */}
          {activeTab === 'HSN_SUMMARY' && hsnSummaryData && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">HSN Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-2 text-center">UOM</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Gross Wt (g)</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                      <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(hsnSummaryData.items || []).map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-amber-900">{h.hsnCode}</td>
                        <td className="py-2 px-3 text-slate-800 font-medium">{h.description}</td>
                        <td className="py-2 px-2 text-center text-slate-500">{h.uom}</td>
                        <td className="py-2 px-2 text-center tabular-nums font-semibold text-slate-800">
                          {h.totalQuantity}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-800 font-mono">
                          {Number(h.totalGrossWeight || 0).toFixed(3)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                          ₹{formatAmount(h.taxableValue)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                          ₹{formatAmount(h.centralTax)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                          ₹{formatAmount(h.stateTax)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                          ₹{formatAmount(h.integratedTax)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-800">
                          ₹{formatAmount(h.totalValue)}
                        </td>
                      </tr>
                    ))}
                    {(!hsnSummaryData.items || hsnSummaryData.items.length === 0) && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          No HSN records found in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {hsnSummaryData.items && hsnSummaryData.items.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-xs">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right uppercase text-[11px]">
                          Total HSN Summary:
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums">{hsnTotals.qty}</td>
                        <td className="py-2 px-2 text-right font-mono">{hsnTotals.gross.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{formatAmount(hsnTotals.taxable)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{formatAmount(hsnTotals.cgst)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{formatAmount(hsnTotals.sgst)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{formatAmount(hsnTotals.igst)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-emerald-900">₹{formatAmount(hsnTotals.total)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              5. SALES & PURCHASE TAX REGISTERS
             ══════════════════════════════════════════════ */}
          {(activeTab === 'SALES_TAX_REGISTER' || activeTab === 'PURCHASE_TAX_REGISTER') && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3">GSTIN</th>
                      <th className="py-2.5 px-2 text-center">Tax Mode</th>
                      <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                      <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeTab === 'SALES_TAX_REGISTER' ? filteredSalesRows : filteredPurchRows).map(
                      (r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-amber-900">{r.invoiceNumber}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-600">{r.invoiceDate}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{r.partyName}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{r.partyGstin || '-'}</td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-700 border border-slate-200">
                              {r.taxMode || 'INTRA_STATE'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">
                            ₹{formatAmount(r.taxableAmount)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                            ₹{formatAmount(r.cgstAmount)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                            ₹{formatAmount(r.sgstAmount)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                            ₹{formatAmount(r.igstAmount)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-800">
                            ₹{formatAmount(r.totalTax)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                            ₹{formatAmount(r.grandTotal)}
                          </td>
                        </tr>
                      )
                    )}
                    {(activeTab === 'SALES_TAX_REGISTER' ? filteredSalesRows : filteredPurchRows).length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          No {activeTab === 'SALES_TAX_REGISTER' ? 'sales' : 'purchase'} invoices found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {(activeTab === 'SALES_TAX_REGISTER' ? filteredSalesRows : filteredPurchRows).length > 0 && (
                    <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-xs">
                      <tr>
                        <td colSpan={5} className="py-2 px-3 text-right uppercase text-[11px]">
                          Total ({activeTab === 'SALES_TAX_REGISTER' ? filteredSalesRows.length : filteredPurchRows.length} Invoices):
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          ₹{formatAmount(activeTab === 'SALES_TAX_REGISTER' ? salesTotals.taxable : purchTotals.taxable)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          ₹{formatAmount(activeTab === 'SALES_TAX_REGISTER' ? salesTotals.cgst : purchTotals.cgst)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          ₹{formatAmount(activeTab === 'SALES_TAX_REGISTER' ? salesTotals.sgst : purchTotals.sgst)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          ₹{formatAmount(activeTab === 'SALES_TAX_REGISTER' ? salesTotals.igst : purchTotals.igst)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-emerald-800">
                          ₹{formatAmount(activeTab === 'SALES_TAX_REGISTER' ? salesTotals.totalTax : purchTotals.totalTax)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-900 font-bold">
                          ₹{formatAmount(activeTab === 'SALES_TAX_REGISTER' ? salesTotals.grandTotal : purchTotals.grandTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              6. TAX MASTERS (RATES & HSN CATALOGUE)
             ══════════════════════════════════════════════ */}
          {activeTab === 'MASTERS' && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs overflow-y-auto">
              {/* Tax Rates Master */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                    Statutory GST Tax Rates
                  </h3>
                  <span className="text-[10px] text-slate-400">Jewellery & Bullion</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Code</th>
                      <th className="py-2 px-2.5">Description</th>
                      <th className="py-2 px-2 text-right">IGST</th>
                      <th className="py-2 px-2 text-right">CGST</th>
                      <th className="py-2 px-2 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taxRates.map((tr) => (
                      <tr key={tr.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-2.5 font-mono font-bold text-amber-900">{tr.code}</td>
                        <td className="py-2 px-2.5 font-medium text-slate-800">{tr.name}</td>
                        <td className="py-2 px-2 text-right tabular-nums font-bold text-slate-800">{tr.igstRate}%</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-600">{tr.cgstRate}%</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-600">{tr.sgstRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HSN Codes Master */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                    Jewellery HSN & SAC Catalogue
                  </h3>
                  <span className="text-[10px] text-slate-400">CBIC Tariffs</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">HSN / SAC</th>
                      <th className="py-2 px-2.5">Item Classification</th>
                      <th className="py-2 px-2 text-right">Default Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hsnCodes.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-2.5 font-mono font-bold text-amber-900">{h.hsnCode}</td>
                        <td className="py-2 px-2.5 font-medium text-slate-700">{h.description}</td>
                        <td className="py-2 px-2 text-right tabular-nums font-bold text-emerald-800">{h.defaultGstRate}%</td>
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
