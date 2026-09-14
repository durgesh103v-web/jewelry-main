import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import {
  FiBarChart2,
  FiBook,
  FiShoppingBag,
  FiShoppingCart,
  FiUsers,
  FiLayers,
  FiInbox,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiCalendar,
  FiDollarSign,
  FiCreditCard,
  FiPieChart,
  FiTrendingUp,
  FiFileText,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiUserCheck,
  FiTruck,
  FiPocket,
  FiActivity,
  FiDatabase,
  FiDisc,
  FiRepeat
} from 'react-icons/fi'
import type { ReportTab, ReportCategory } from '../types'
import { DateRangeFilterBar } from '../components/DateRangeFilterBar'

interface FinancialReportsHubScreenProps {
  onClose?: () => void
  initialTab?: ReportTab
}

export const FinancialReportsHubScreen: React.FC<FinancialReportsHubScreenProps> = ({
  onClose,
  initialTab = 'DAY_BOOK'
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab)
  const [category, setCategory] = useState<ReportCategory>('FINANCIAL')
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
  const [dayBookData, setDayBookData] = useState<any>(null)
  const [cashBookData, setCashBookData] = useState<any>(null)
  const [bankBookData, setBankBookData] = useState<any>(null)
  const [salesRegisterData, setSalesRegisterData] = useState<any>(null)
  const [purchaseRegisterData, setPurchaseRegisterData] = useState<any>(null)
  const [salesReturnData, setSalesReturnData] = useState<any>(null)
  const [purchaseReturnData, setPurchaseReturnData] = useState<any>(null)
  const [customerOutstandingData, setCustomerOutstandingData] = useState<any>(null)
  const [supplierOutstandingData, setSupplierOutstandingData] = useState<any>(null)
  const [advancesData, setAdvancesData] = useState<any>(null)
  const [oldGoldData, setOldGoldData] = useState<any>(null)
  const [exchangesData, setExchangesData] = useState<any>(null)
  const [stockMovementData, setStockMovementData] = useState<any>(null)
  const [stockValuationData, setStockValuationData] = useState<any>(null)
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null)
  const [profitAndLossData, setProfitAndLossData] = useState<any>(null)
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null)

  // Load active report data
  const loadReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const filter = { startDate, endDate, search }

    try {
      if (activeTab === 'DAY_BOOK') {
        const res = await window.api.financialReports.getDayBook(filter)
        setDayBookData(res)
      } else if (activeTab === 'CASH_BOOK') {
        const res = await window.api.financialReports.getCashBook(filter)
        setCashBookData(res)
      } else if (activeTab === 'BANK_BOOK') {
        const res = await window.api.financialReports.getBankBook(filter)
        setBankBookData(res)
      } else if (activeTab === 'SALES_REGISTER') {
        const res = await window.api.financialReports.getSalesRegister(filter)
        setSalesRegisterData(res)
      } else if (activeTab === 'PURCHASE_REGISTER') {
        const res = await window.api.financialReports.getPurchaseRegister(filter)
        setPurchaseRegisterData(res)
      } else if (activeTab === 'SALES_RETURN') {
        const res = await window.api.financialReports.getReturnRegister({ returnType: 'SALES_RETURN', filter })
        setSalesReturnData(res)
      } else if (activeTab === 'PURCHASE_RETURN') {
        const res = await window.api.financialReports.getReturnRegister({ returnType: 'PURCHASE_RETURN', filter })
        setPurchaseReturnData(res)
      } else if (activeTab === 'CUSTOMER_OUTSTANDING') {
        const res = await window.api.financialReports.getPartyOutstanding({ partyType: 'CUSTOMER', filter })
        setCustomerOutstandingData(res)
      } else if (activeTab === 'SUPPLIER_OUTSTANDING') {
        const res = await window.api.financialReports.getPartyOutstanding({ partyType: 'SUPPLIER', filter })
        setSupplierOutstandingData(res)
      } else if (activeTab === 'ADVANCES') {
        const res = await window.api.financialReports.getAdvances(filter)
        setAdvancesData(res)
      } else if (activeTab === 'OLD_GOLD') {
        const res = await window.api.financialReports.getOldGold(filter)
        setOldGoldData(res)
      } else if (activeTab === 'EXCHANGES') {
        const res = await window.api.financialReports.getMetalExchanges(filter)
        setExchangesData(res)
      } else if (activeTab === 'STOCK_MOVEMENT') {
        const res = await window.api.financialReports.getStockMovements(filter)
        setStockMovementData(res)
      } else if (activeTab === 'STOCK_VALUATION') {
        const res = await window.api.financialReports.getStockValuation(filter)
        setStockValuationData(res)
      } else if (activeTab === 'TRIAL_BALANCE') {
        const res = await window.api.financialReports.getTrialBalance(filter)
        setTrialBalanceData(res)
      } else if (activeTab === 'PROFIT_LOSS') {
        const res = await window.api.financialReports.getProfitAndLoss(filter)
        setProfitAndLossData(res)
      } else if (activeTab === 'BALANCE_SHEET') {
        const res = await window.api.financialReports.getBalanceSheet(endDate)
        setBalanceSheetData(res)
      }
    } catch (err: any) {
      console.error('Error fetching report:', err)
      setError(err.message || 'Failed to fetch report data')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, startDate, endDate, search])

  useEffect(() => {
    loadReport()
  }, [loadReport])

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
    if (activeTab === 'PROFIT_LOSS') {
      if (!profitAndLossData) {
        setNotice({ type: 'info', message: 'Profit & Loss data is still loading or unavailable.' })
        return
      }
      const filename = `profit_and_loss_${startDate}_to_${endDate}.csv`
      const lines = [
        `"Profit & Loss Statement"`,
        `"Period: ${startDate} to ${endDate}"`,
        `""`,
        `"Particulars","Amount (INR)"`,
        `"Gross Sales Revenue",${profitAndLossData.salesRevenue ?? 0}`,
        `"Less: Sales Returns & Credit Notes",-${profitAndLossData.salesReturns ?? 0}`,
        `"Net Sales Revenue",${profitAndLossData.netSales ?? 0}`,
        `"Cost of Purchases",${profitAndLossData.costOfPurchases ?? 0}`,
        `"Less: Purchase Returns",-${profitAndLossData.purchaseReturns ?? 0}`,
        `"Net Cost of Purchases",${profitAndLossData.netPurchases ?? 0}`,
        `"Gross Operating Profit",${profitAndLossData.grossProfit ?? 0}`
      ]
      downloadCsv(filename, lines.join('\n'))
      return
    }

    if (activeTab === 'BALANCE_SHEET') {
      if (!balanceSheetData) {
        setNotice({ type: 'info', message: 'Balance Sheet data is still loading or unavailable.' })
        return
      }
      const filename = `balance_sheet_as_of_${endDate}.csv`
      const lines = [
        `"Balance Sheet"`,
        `"As of Date: ${endDate}"`,
        `""`,
        `"Section","Item","Amount (INR)"`,
        `"Assets","Cash in Hand",${balanceSheetData.assets?.cashBalance ?? 0}`,
        `"Assets","Bank Accounts",${balanceSheetData.assets?.bankBalance ?? 0}`,
        `"Assets","Customer Receivables (Outstanding)",${balanceSheetData.assets?.customerReceivables ?? 0}`,
        `"Assets","Total Current Assets",${balanceSheetData.assets?.totalCurrentAssets ?? 0}`,
        `"Liabilities","Supplier Payables (Outstanding)",${balanceSheetData.liabilities?.supplierPayables ?? 0}`,
        `"Liabilities","Customer Advances Held",${balanceSheetData.liabilities?.customerAdvances ?? 0}`,
        `"Liabilities","Total Liabilities",${balanceSheetData.liabilities?.totalLiabilities ?? 0}`,
        `"Equity / Net Worth","Net Worth",${balanceSheetData.equity?.netWorth ?? 0}`
      ]
      downloadCsv(filename, lines.join('\n'))
      return
    }

    // Tabular export
    let headers: string[] = []
    let rows: any[] = []
    let filename = `${activeTab.toLowerCase()}_${startDate}_to_${endDate}.csv`

    if (activeTab === 'DAY_BOOK') {
      headers = ['Date', 'Bill / Ref No', 'Account Name', 'Narration', 'Cash Debit (In)', 'Cash Credit (Out)', 'Bank Debit (In)', 'Bank Credit (Out)']
      rows = (dayBookData?.rows || []).map((r: any) => [
        escapeCsv(r.entryDate),
        escapeCsv(r.billNo),
        escapeCsv(r.accountName),
        escapeCsv(r.narration),
        r.cashNave || 0,
        r.cashJama || 0,
        r.bankNave || 0,
        r.bankJama || 0
      ])
    } else if (activeTab === 'CASH_BOOK') {
      headers = ['Date', 'Ref No', 'Account', 'Narration', 'Cash In', 'Cash Out', 'Running Balance']
      rows = (cashBookData?.rows || []).map((r: any) => [
        escapeCsv(r.entryDate),
        escapeCsv(r.billNo),
        escapeCsv(r.accountName),
        escapeCsv(r.narration),
        r.cashIn || 0,
        r.cashOut || 0,
        r.runningBalance || 0
      ])
    } else if (activeTab === 'BANK_BOOK') {
      headers = ['Date', 'Ref No', 'Account', 'Narration', 'Bank In', 'Bank Out', 'Running Balance']
      rows = (bankBookData?.rows || []).map((r: any) => [
        escapeCsv(r.entryDate),
        escapeCsv(r.billNo),
        escapeCsv(r.accountName),
        escapeCsv(r.narration),
        r.bankIn || 0,
        r.bankOut || 0,
        r.runningBalance || 0
      ])
    } else if (activeTab === 'SALES_REGISTER') {
      headers = ['Date', 'Invoice No', 'Customer Name', 'Gross Weight (g)', 'Fine Weight (g)', 'Taxable Amount (INR)', 'CGST', 'SGST', 'IGST', 'Grand Total (INR)', 'Paid Amount (INR)', 'Balance Due (INR)']
      rows = (salesRegisterData?.rows || []).map((r: any) => [
        escapeCsv(r.invoiceDate),
        escapeCsv(r.invoiceNumber),
        escapeCsv(r.customerName),
        r.grossWeight || 0,
        r.fineWeight || 0,
        r.taxableAmount || 0,
        r.cgst || 0,
        r.sgst || 0,
        r.igst || 0,
        r.grandTotal || 0,
        r.paidAmount || 0,
        r.balanceDue || 0
      ])
    } else if (activeTab === 'PURCHASE_REGISTER') {
      headers = ['Date', 'Bill No', 'Supplier Name', 'Gross Weight (g)', 'Taxable Amount (INR)', 'CGST', 'SGST', 'IGST', 'Grand Total (INR)', 'Paid (INR)', 'Balance Due (INR)']
      rows = (purchaseRegisterData?.rows || []).map((r: any) => [
        escapeCsv(r.purchaseDate),
        escapeCsv(r.supplierBillNo),
        escapeCsv(r.supplierName),
        r.grossWeight || 0,
        r.taxableAmount || 0,
        r.cgst || 0,
        r.sgst || 0,
        r.igst || 0,
        r.grandTotal || 0,
        r.paidAmount || 0,
        r.balanceDue || 0
      ])
    } else if (activeTab === 'SALES_RETURN') {
      headers = ['Date', 'Return No', 'Original Invoice', 'Customer Name', 'Taxable Amount (INR)', 'Total Return (INR)', 'Refunded Amount (INR)']
      rows = (salesReturnData?.rows || []).map((r: any) => [
        escapeCsv(r.returnDate),
        escapeCsv(r.returnNumber),
        escapeCsv(r.originalInvoiceNumber),
        escapeCsv(r.partyName),
        r.taxableAmount || 0,
        r.totalAmount || 0,
        r.refundedAmount || 0
      ])
    } else if (activeTab === 'PURCHASE_RETURN') {
      headers = ['Date', 'Return No', 'Original Bill', 'Supplier Name', 'Taxable Amount (INR)', 'Total Return (INR)', 'Adjusted Amount (INR)']
      rows = (purchaseReturnData?.rows || []).map((r: any) => [
        escapeCsv(r.returnDate),
        escapeCsv(r.returnNumber),
        escapeCsv(r.originalInvoiceNumber),
        escapeCsv(r.partyName),
        r.taxableAmount || 0,
        r.totalAmount || 0,
        r.refundedAmount || 0
      ])
    } else if (activeTab === 'CUSTOMER_OUTSTANDING' || activeTab === 'SUPPLIER_OUTSTANDING') {
      headers = ['Party Name', 'Contact / Phone', 'City', 'Opening Balance', 'Debit Amount', 'Credit Amount', 'Closing Balance']
      const data = activeTab === 'CUSTOMER_OUTSTANDING' ? customerOutstandingData : supplierOutstandingData
      rows = (data?.rows || []).map((r: any) => [
        escapeCsv(r.partyName),
        escapeCsv(r.phone),
        escapeCsv(r.city),
        r.openingBalance || 0,
        r.debitAmount || 0,
        r.creditAmount || 0,
        r.closingBalance || 0
      ])
    } else if (activeTab === 'ADVANCES') {
      headers = ['Date', 'Receipt No', 'Customer Name', 'Amount (INR)', 'Payment Mode', 'Notes']
      rows = (advancesData?.rows || []).map((r: any) => [
        escapeCsv(r.receiptDate),
        escapeCsv(r.receiptNumber),
        escapeCsv(r.customerName),
        r.amount || 0,
        escapeCsv(r.paymentMode),
        escapeCsv(r.notes)
      ])
    } else if (activeTab === 'STOCK_MOVEMENT') {
      headers = ['Date', 'Type', 'Ref No', 'Item Name', 'Pcs In', 'Pcs Out', 'Weight In (g)', 'Weight Out (g)', 'Fine In (g)', 'Fine Out (g)']
      rows = (stockMovementData?.rows || []).map((r: any) => [
        escapeCsv(r.movementDate),
        escapeCsv(r.movementType),
        escapeCsv(r.referenceNo),
        escapeCsv(r.itemName),
        r.pcsIn || 0,
        r.pcsOut || 0,
        r.grossWeightIn || 0,
        r.grossWeightOut || 0,
        r.fineWeightIn || 0,
        r.fineWeightOut || 0
      ])
    } else if (activeTab === 'STOCK_VALUATION') {
      headers = ['Item Name', 'Category', 'Metal Type', 'Purity', 'Current Pcs', 'Gross Wt (g)', 'Net Wt (g)', 'Fine Wt (g)', 'Est Rate/g', 'Est Metal Value (INR)']
      rows = (stockValuationData?.rows || []).map((r: any) => [
        escapeCsv(r.itemName),
        escapeCsv(r.categoryName),
        escapeCsv(r.metalType),
        escapeCsv(r.purity),
        r.currentPcs || 0,
        r.currentGrossWeight || 0,
        r.currentNetWeight || 0,
        r.currentFineWeight || 0,
        r.estimatedRatePerGram || 0,
        r.estimatedMetalValue || 0
      ])
    } else if (activeTab === 'OLD_GOLD') {
      headers = ['Date', 'Receipt No', 'Customer Name', 'Gross Wt (g)', 'Purity (%)', 'Fine Wt (g)', 'Rate/g', 'Total Valuation (INR)']
      rows = (oldGoldData?.rows || []).map((r: any) => [
        escapeCsv(r.receiptDate),
        escapeCsv(r.receiptNumber),
        escapeCsv(r.customerName),
        r.grossWeight || 0,
        r.purity || 0,
        r.fineWeight || 0,
        r.ratePerGram || 0,
        r.totalAmount || 0
      ])
    } else if (activeTab === 'EXCHANGES') {
      headers = ['Date', 'Exchange No', 'Bill No', 'Customer Name', 'Given Weight (g)', 'Taken Weight (g)', 'Diff Weight (g)', 'Adjustment (INR)']
      rows = (exchangesData?.rows || []).map((r: any) => [
        escapeCsv(r.exchangeDate),
        escapeCsv(r.exchangeNumber),
        escapeCsv(r.billNo),
        escapeCsv(r.customerName),
        r.givenWeight || 0,
        r.takenWeight || 0,
        r.diffWeight || 0,
        r.adjustmentAmount || 0
      ])
    } else if (activeTab === 'TRIAL_BALANCE') {
      headers = ['Account Code', 'Account Name', 'Group', 'Debit Total (INR)', 'Credit Total (INR)', 'Net Debit (INR)', 'Net Credit (INR)']
      rows = (trialBalanceData?.rows || []).map((r: any) => [
        escapeCsv(r.accountCode),
        escapeCsv(r.accountName),
        escapeCsv(r.groupName),
        r.debitTotal || 0,
        r.creditTotal || 0,
        r.netDebit || 0,
        r.netCredit || 0
      ])
    }

    if (rows.length === 0) {
      setNotice({ type: 'info', message: 'No records available to export for the current filters.' })
      return
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    downloadCsv(filename, csvContent)
  }

  // Active Category tabs configuration
  const categoryConfig: { id: ReportCategory; label: string; defaultTab: ReportTab; icon: React.ReactNode }[] = [
    { id: 'FINANCIAL', label: 'Financial Books', defaultTab: 'DAY_BOOK', icon: <FiBook className="w-3.5 h-3.5" /> },
    { id: 'SALES', label: 'Sales', defaultTab: 'SALES_REGISTER', icon: <FiShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'PURCHASE', label: 'Purchases', defaultTab: 'PURCHASE_REGISTER', icon: <FiShoppingCart className="w-3.5 h-3.5" /> },
    { id: 'PARTIES', label: 'Parties & Outstanding', defaultTab: 'CUSTOMER_OUTSTANDING', icon: <FiUsers className="w-3.5 h-3.5" /> },
    { id: 'INVENTORY', label: 'Stock & Metals', defaultTab: 'STOCK_MOVEMENT', icon: <FiLayers className="w-3.5 h-3.5" /> }
  ]

  // Subtabs per category with icons
  const subtabsConfig: Record<ReportCategory, { id: ReportTab; label: string; icon: React.ReactNode }[]> = {
    FINANCIAL: [
      { id: 'DAY_BOOK', label: 'Day Book', icon: <FiCalendar className="w-3.5 h-3.5" /> },
      { id: 'CASH_BOOK', label: 'Cash Book', icon: <FiDollarSign className="w-3.5 h-3.5" /> },
      { id: 'BANK_BOOK', label: 'Bank Book', icon: <FiCreditCard className="w-3.5 h-3.5" /> },
      { id: 'TRIAL_BALANCE', label: 'Trial Balance', icon: <FiPieChart className="w-3.5 h-3.5" /> },
      { id: 'PROFIT_LOSS', label: 'Profit & Loss', icon: <FiTrendingUp className="w-3.5 h-3.5" /> },
      { id: 'BALANCE_SHEET', label: 'Balance Sheet', icon: <FiFileText className="w-3.5 h-3.5" /> }
    ],
    SALES: [
      { id: 'SALES_REGISTER', label: 'Sales Register', icon: <FiFileText className="w-3.5 h-3.5" /> },
      { id: 'SALES_RETURN', label: 'Sales Returns & Credit Notes', icon: <FiCornerUpLeft className="w-3.5 h-3.5" /> }
    ],
    PURCHASE: [
      { id: 'PURCHASE_REGISTER', label: 'Purchase Register', icon: <FiFileText className="w-3.5 h-3.5" /> },
      { id: 'PURCHASE_RETURN', label: 'Purchase Returns & Debit Notes', icon: <FiCornerUpRight className="w-3.5 h-3.5" /> }
    ],
    PARTIES: [
      { id: 'CUSTOMER_OUTSTANDING', label: 'Customer Outstanding', icon: <FiUserCheck className="w-3.5 h-3.5" /> },
      { id: 'SUPPLIER_OUTSTANDING', label: 'Supplier Outstanding', icon: <FiTruck className="w-3.5 h-3.5" /> },
      { id: 'ADVANCES', label: 'Customer Advances', icon: <FiPocket className="w-3.5 h-3.5" /> }
    ],
    INVENTORY: [
      { id: 'STOCK_MOVEMENT', label: 'Stock Movement', icon: <FiActivity className="w-3.5 h-3.5" /> },
      { id: 'STOCK_VALUATION', label: 'Stock Valuation', icon: <FiDatabase className="w-3.5 h-3.5" /> },
      { id: 'OLD_GOLD', label: 'Old Gold Receipts', icon: <FiDisc className="w-3.5 h-3.5" /> },
      { id: 'EXCHANGES', label: 'Metal Exchanges', icon: <FiRepeat className="w-3.5 h-3.5" /> }
    ]
  }

  // Summary Metrics Calculation
  const summaryMetrics = useMemo(() => {
    if (activeTab === 'DAY_BOOK') {
      const rows = dayBookData?.rows || []
      const totalCashDebit = rows.reduce((acc: number, r: any) => acc + (r.cashNave || 0), 0)
      const totalCashCredit = rows.reduce((acc: number, r: any) => acc + (r.cashJama || 0), 0)
      const totalBankDebit = rows.reduce((acc: number, r: any) => acc + (r.bankNave || 0), 0)
      const totalBankCredit = rows.reduce((acc: number, r: any) => acc + (r.bankJama || 0), 0)
      return [
        { label: 'Total Entries', value: rows.length, isCurrency: false },
        { label: 'Cash Debit (In)', value: totalCashDebit, isCurrency: true, color: 'text-amber-600' },
        { label: 'Cash Credit (Out)', value: totalCashCredit, isCurrency: true, color: 'text-emerald-600' },
        { label: 'Bank Debit (In)', value: totalBankDebit, isCurrency: true, color: 'text-amber-600' },
        { label: 'Bank Credit (Out)', value: totalBankCredit, isCurrency: true, color: 'text-emerald-600' }
      ]
    }
    if (activeTab === 'CASH_BOOK') {
      const rows = cashBookData?.rows || []
      const totalIn = rows.reduce((acc: number, r: any) => acc + (r.cashIn || 0), 0)
      const totalOut = rows.reduce((acc: number, r: any) => acc + (r.cashOut || 0), 0)
      const latestBalance = rows.length > 0 ? rows[rows.length - 1].runningBalance : 0
      return [
        { label: 'Total Transactions', value: rows.length, isCurrency: false },
        { label: 'Total Cash In', value: totalIn, isCurrency: true, color: 'text-emerald-600' },
        { label: 'Total Cash Out', value: totalOut, isCurrency: true, color: 'text-rose-600' },
        { label: 'Net Cash Balance', value: latestBalance, isCurrency: true, color: 'text-primary' }
      ]
    }
    if (activeTab === 'BANK_BOOK') {
      const rows = bankBookData?.rows || []
      const totalIn = rows.reduce((acc: number, r: any) => acc + (r.bankIn || 0), 0)
      const totalOut = rows.reduce((acc: number, r: any) => acc + (r.bankOut || 0), 0)
      const latestBalance = rows.length > 0 ? rows[rows.length - 1].runningBalance : 0
      return [
        { label: 'Total Bank Entries', value: rows.length, isCurrency: false },
        { label: 'Total Bank In', value: totalIn, isCurrency: true, color: 'text-emerald-600' },
        { label: 'Total Bank Out', value: totalOut, isCurrency: true, color: 'text-rose-600' },
        { label: 'Closing Bank Balance', value: latestBalance, isCurrency: true, color: 'text-primary' }
      ]
    }
    if (activeTab === 'SALES_REGISTER') {
      const rows = salesRegisterData?.rows || []
      const totalInvoices = rows.length
      const totalGross = rows.reduce((acc: number, r: any) => acc + (r.grossWeight || 0), 0)
      const totalFine = rows.reduce((acc: number, r: any) => acc + (r.fineWeight || 0), 0)
      const totalGrand = rows.reduce((acc: number, r: any) => acc + (r.grandTotal || 0), 0)
      const totalPaid = rows.reduce((acc: number, r: any) => acc + (r.paidAmount || 0), 0)
      const totalBalance = rows.reduce((acc: number, r: any) => acc + (r.balanceDue || 0), 0)
      return [
        { label: 'Total Invoices', value: totalInvoices, isCurrency: false },
        { label: 'Gross Weight', value: `${totalGross.toFixed(3)}g`, isCurrency: false },
        { label: 'Fine Weight', value: `${totalFine.toFixed(3)}g`, isCurrency: false },
        { label: 'Total Sales Revenue', value: totalGrand, isCurrency: true, color: 'text-primary' },
        { label: 'Amount Received', value: totalPaid, isCurrency: true, color: 'text-emerald-600' },
        { label: 'Outstanding Balance', value: totalBalance, isCurrency: true, color: 'text-rose-600' }
      ]
    }
    if (activeTab === 'PURCHASE_REGISTER') {
      const rows = purchaseRegisterData?.rows || []
      const totalInvoices = rows.length
      const totalGross = rows.reduce((acc: number, r: any) => acc + (r.grossWeight || 0), 0)
      const totalGrand = rows.reduce((acc: number, r: any) => acc + (r.grandTotal || 0), 0)
      const totalPaid = rows.reduce((acc: number, r: any) => acc + (r.paidAmount || 0), 0)
      const totalBalance = rows.reduce((acc: number, r: any) => acc + (r.balanceDue || 0), 0)
      return [
        { label: 'Total Inward Bills', value: totalInvoices, isCurrency: false },
        { label: 'Gross Weight', value: `${totalGross.toFixed(3)}g`, isCurrency: false },
        { label: 'Total Purchase Cost', value: totalGrand, isCurrency: true, color: 'text-primary' },
        { label: 'Paid to Suppliers', value: totalPaid, isCurrency: true, color: 'text-emerald-600' },
        { label: 'Supplier Due', value: totalBalance, isCurrency: true, color: 'text-amber-600' }
      ]
    }
    if (activeTab === 'CUSTOMER_OUTSTANDING') {
      const rows = customerOutstandingData?.rows || []
      const totalReceivable = rows.reduce((acc: number, r: any) => acc + (r.closingBalance > 0 ? r.closingBalance : 0), 0)
      return [
        { label: 'Total Customers', value: rows.length, isCurrency: false },
        { label: 'Total Outstanding Receivable', value: totalReceivable, isCurrency: true, color: 'text-amber-600' }
      ]
    }
    if (activeTab === 'SUPPLIER_OUTSTANDING') {
      const rows = supplierOutstandingData?.rows || []
      const totalPayable = rows.reduce((acc: number, r: any) => acc + (r.closingBalance > 0 ? r.closingBalance : 0), 0)
      return [
        { label: 'Total Suppliers', value: rows.length, isCurrency: false },
        { label: 'Total Outstanding Payable', value: totalPayable, isCurrency: true, color: 'text-rose-600' }
      ]
    }
    if (activeTab === 'STOCK_VALUATION') {
      const rows = stockValuationData?.rows || []
      const totalPcs = rows.reduce((acc: number, r: any) => acc + (r.currentPcs || 0), 0)
      const totalGross = rows.reduce((acc: number, r: any) => acc + (r.currentGrossWeight || 0), 0)
      const totalFine = rows.reduce((acc: number, r: any) => acc + (r.currentFineWeight || 0), 0)
      const totalValue = rows.reduce((acc: number, r: any) => acc + (r.estimatedMetalValue || 0), 0)
      return [
        { label: 'Total Items', value: rows.length, isCurrency: false },
        { label: 'Total Stock Pcs', value: totalPcs, isCurrency: false },
        { label: 'Total Gross Weight', value: `${totalGross.toFixed(3)}g`, isCurrency: false },
        { label: 'Total Fine Weight', value: `${totalFine.toFixed(3)}g`, isCurrency: false },
        { label: 'Est. Stock Valuation', value: Math.round(totalValue), isCurrency: true, color: 'text-primary' }
      ]
    }
    return null
  }, [
    activeTab,
    dayBookData,
    cashBookData,
    bankBookData,
    salesRegisterData,
    purchaseRegisterData,
    customerOutstandingData,
    supplierOutstandingData,
    stockValuationData
  ])

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiBarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">
              Financial Reporting & Accounting Hub
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 hidden sm:block">
              Comprehensive double-entry ledgers, registers, inventory movements & financial statements
            </p>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold gap-1">
          {categoryConfig.map((cat) => {
            const isSelected = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id)
                  setActiveTab(cat.defaultTab)
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold border-amber-600 shadow-xs'
                    : 'text-slate-700 hover:text-amber-900 hover:bg-amber-50/70 border-transparent font-medium'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Subtabs Bar */}
      <div className="px-4 py-2 bg-white border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
        {subtabsConfig[category]?.map((sub) => {
          const isSelected = activeTab === sub.id
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setActiveTab(sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold border-amber-600 shadow-xs'
                  : 'text-slate-700 hover:text-amber-900 hover:bg-amber-50/70 border border-slate-200/80 bg-slate-50/60 shadow-2xs font-medium'
              }`}
            >
              {sub.icon}
              <span>{sub.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {/* Filter Bar */}
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
          onRefresh={loadReport}
          isLoading={isLoading}
        />

        {/* KPI Metrics Strip */}
        {summaryMetrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 shrink-0">
            {summaryMetrics.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-center"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {m.label}
                </span>
                <span className={`text-sm font-extrabold font-mono mt-0.5 ${m.color || 'text-slate-900'}`}>
                  {m.isCurrency && typeof m.value === 'number' ? `₹${m.value.toLocaleString()}` : m.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {notice && (
          <div
            className={`p-2.5 px-3 rounded-lg text-xs flex items-center justify-between border ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notice.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {notice.type === 'success' ? (
                <FiCheckCircle className="w-4 h-4 text-emerald-600" />
              ) : notice.type === 'info' ? (
                <FiInfo className="w-4 h-4 text-blue-600" />
              ) : (
                <FiAlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{notice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold ml-2"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Report Content Panel */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {/* 1. Day Book Table */}
          {activeTab === 'DAY_BOOK' && (
            <>
              {(!dayBookData?.rows || dayBookData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Day Book Records</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No transactions recorded between {startDate} and {endDate}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'))
                      setEndDate(dayjs().format('YYYY-MM-DD'))
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                  >
                    Reset to This Month
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Bill / Ref No</th>
                      <th className="py-2.5 px-3">Account Name</th>
                      <th className="py-2.5 px-3">Narration</th>
                      <th className="py-2.5 px-3 text-right">Cash Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Cash Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Bank Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Bank Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayBookData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{r.billNo}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.accountName}</td>
                        <td className="py-2 px-3 text-slate-500">{r.narration}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {r.cashNave > 0 ? `₹${r.cashNave.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {r.cashJama > 0 ? `₹${r.cashJama.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {r.bankNave > 0 ? `₹${r.bankNave.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {r.bankJama > 0 ? `₹${r.bankJama.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Total:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{dayBookData.rows.reduce((acc: number, r: any) => acc + (r.cashNave || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{dayBookData.rows.reduce((acc: number, r: any) => acc + (r.cashJama || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{dayBookData.rows.reduce((acc: number, r: any) => acc + (r.bankNave || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{dayBookData.rows.reduce((acc: number, r: any) => acc + (r.bankJama || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* 2. Cash Book Table */}
          {activeTab === 'CASH_BOOK' && (
            <>
              {(!cashBookData?.rows || cashBookData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Cash Book Records</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No cash transactions recorded between {startDate} and {endDate}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'))
                      setEndDate(dayjs().format('YYYY-MM-DD'))
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                  >
                    Reset to This Month
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Ref No</th>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3">Narration</th>
                      <th className="py-2.5 px-3 text-right">Cash In (₹)</th>
                      <th className="py-2.5 px-3 text-right">Cash Out (₹)</th>
                      <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashBookData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{r.billNo}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.accountName}</td>
                        <td className="py-2 px-3 text-slate-500">{r.narration}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {r.cashIn > 0 ? `₹${r.cashIn.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          {r.cashOut > 0 ? `₹${r.cashOut.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{r.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Total:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{cashBookData.rows.reduce((acc: number, r: any) => acc + (r.cashIn || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                        ₹{cashBookData.rows.reduce((acc: number, r: any) => acc + (r.cashOut || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{(cashBookData.rows[cashBookData.rows.length - 1]?.runningBalance || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* 3. Sales Register */}
          {activeTab === 'SALES_REGISTER' && (
            <>
              {(!salesRegisterData?.rows || salesRegisterData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Sales Invoices Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No sales invoices generated between {startDate} and {endDate}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'))
                      setEndDate(dayjs().format('YYYY-MM-DD'))
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                  >
                    Reset to This Month
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-2 text-center">Pcs</th>
                      <th className="py-2.5 px-2 text-right">Gross (g)</th>
                      <th className="py-2.5 px-2 text-right">Fine (g)</th>
                      <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                      <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                      <th className="py-2.5 px-3 text-right">Balance Due (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesRegisterData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.invoiceNumber}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{r.invoiceDate}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.customerName || r.accountName}</td>
                        <td className="py-2 px-2 text-center font-mono">{r.totalPcs}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.fineWeight.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                          ₹{r.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                          ₹{r.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          ₹{r.balanceDue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Total ({salesRegisterData.rows.length} Bills):
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        {salesRegisterData.rows.reduce((acc: number, r: any) => acc + (r.totalPcs || 0), 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {salesRegisterData.rows.reduce((acc: number, r: any) => acc + (r.grossWeight || 0), 0).toFixed(3)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {salesRegisterData.rows.reduce((acc: number, r: any) => acc + (r.fineWeight || 0), 0).toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{salesRegisterData.rows.reduce((acc: number, r: any) => acc + (r.grandTotal || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{salesRegisterData.rows.reduce((acc: number, r: any) => acc + (r.paidAmount || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                        ₹{salesRegisterData.rows.reduce((acc: number, r: any) => acc + (r.balanceDue || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* 4. Purchase Register */}
          {activeTab === 'PURCHASE_REGISTER' && (
            <>
              {(!purchaseRegisterData?.rows || purchaseRegisterData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Purchase Invoices Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No inward purchases recorded between {startDate} and {endDate}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'))
                      setEndDate(dayjs().format('YYYY-MM-DD'))
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                  >
                    Reset to This Month
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Purchase No</th>
                      <th className="py-2.5 px-3">Supplier Ref</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-2 text-center">Pcs</th>
                      <th className="py-2.5 px-2 text-right">Gross (g)</th>
                      <th className="py-2.5 px-3 text-right">Total Inward (₹)</th>
                      <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                      <th className="py-2.5 px-3 text-right">Supplier Due (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseRegisterData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.invoiceNumber}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{r.supplierInvoiceNumber || '-'}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{r.invoiceDate}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.supplierName || r.accountName}</td>
                        <td className="py-2 px-2 text-center font-mono">{r.totalPcs}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                          ₹{r.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                          ₹{r.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                          ₹{r.balanceDue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Total:
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        {purchaseRegisterData.rows.reduce((acc: number, r: any) => acc + (r.totalPcs || 0), 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {purchaseRegisterData.rows.reduce((acc: number, r: any) => acc + (r.grossWeight || 0), 0).toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{purchaseRegisterData.rows.reduce((acc: number, r: any) => acc + (r.grandTotal || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{purchaseRegisterData.rows.reduce((acc: number, r: any) => acc + (r.paidAmount || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{purchaseRegisterData.rows.reduce((acc: number, r: any) => acc + (r.balanceDue || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* 5. Customer / Supplier Outstanding */}
          {(activeTab === 'CUSTOMER_OUTSTANDING' || activeTab === 'SUPPLIER_OUTSTANDING') && (
            <>
              {(!(activeTab === 'CUSTOMER_OUTSTANDING' ? customerOutstandingData?.rows : supplierOutstandingData?.rows) ||
                (activeTab === 'CUSTOMER_OUTSTANDING' ? customerOutstandingData?.rows : supplierOutstandingData?.rows).length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Outstanding Records</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No party balances found for the active filter.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3">Mobile</th>
                      <th className="py-2.5 px-3">City</th>
                      <th className="py-2.5 px-3 text-right">Opening (₹)</th>
                      <th className="py-2.5 px-3 text-right">Period Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Period Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net Balance (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(
                      (activeTab === 'CUSTOMER_OUTSTANDING'
                        ? customerOutstandingData?.rows
                        : supplierOutstandingData?.rows) || []
                    ).map((r: any) => (
                      <tr key={r.accountId} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.name}</td>
                        <td className="py-2 px-3 text-slate-500">{r.mobile || '-'}</td>
                        <td className="py-2 px-3 text-slate-500">{r.city || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{r.openingBalance.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{r.periodDebit.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{r.periodCredit.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.abs(r.closingBalance).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
                              r.status === 'RECEIVABLE'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : r.status === 'PAYABLE'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* 6. Trial Balance */}
          {activeTab === 'TRIAL_BALANCE' && (
            <>
              {(!trialBalanceData?.rows || trialBalanceData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Ledger Accounts</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No account balances found for the period {startDate} to {endDate}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Account Name</th>
                      <th className="py-2.5 px-3">Group</th>
                      <th className="py-2.5 px-3">Group Type</th>
                      <th className="py-2.5 px-3 text-right">Period Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Period Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Closing Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Closing Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trialBalanceData.rows.map((r: any) => (
                      <tr key={r.accountId} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.accountName}</td>
                        <td className="py-2 px-3 text-slate-500">{r.groupName}</td>
                        <td className="py-2 px-3 text-slate-500">{r.groupType}</td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {r.periodDebit > 0 ? `₹${r.periodDebit.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {r.periodCredit > 0 ? `₹${r.periodCredit.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {r.closingDebit > 0 ? `₹${r.closingDebit.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {r.closingCredit > 0 ? `₹${r.closingCredit.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Grand Total:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{trialBalanceData.rows.reduce((acc: number, r: any) => acc + (r.periodDebit || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{trialBalanceData.rows.reduce((acc: number, r: any) => acc + (r.periodCredit || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{trialBalanceData.rows.reduce((acc: number, r: any) => acc + (r.closingDebit || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{trialBalanceData.rows.reduce((acc: number, r: any) => acc + (r.closingCredit || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* 7. Profit & Loss Statement */}
          {activeTab === 'PROFIT_LOSS' && profitAndLossData && (
            <div className="p-6 max-w-2xl mx-auto space-y-4 text-xs w-full">
              <h2 className="text-sm font-bold text-slate-900 text-center border-b border-slate-200 pb-2">
                Profit & Loss Statement ({profitAndLossData.startDate} to {profitAndLossData.endDate})
              </h2>
              <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-white shadow-2xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 font-medium">Gross Sales Revenue:</span>
                  <span className="font-mono font-bold text-slate-900">₹{profitAndLossData.salesRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-600">
                  <span className="font-medium">Less: Sales Returns & Credit Notes:</span>
                  <span className="font-mono font-bold">-₹{profitAndLossData.salesReturns.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-y border-slate-200 font-bold text-amber-700">
                  <span>Net Sales Revenue:</span>
                  <span className="font-mono">₹{profitAndLossData.netSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 font-medium">Cost of Purchases:</span>
                  <span className="font-mono text-slate-900">₹{profitAndLossData.costOfPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-600">
                  <span className="font-medium">Less: Purchase Returns:</span>
                  <span className="font-mono font-bold">-₹{profitAndLossData.purchaseReturns.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-y border-slate-200 font-bold text-slate-900">
                  <span>Net Cost of Purchases:</span>
                  <span className="font-mono">₹{profitAndLossData.netPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-200 font-black text-sm text-emerald-700">
                  <span>Gross Operating Profit:</span>
                  <span className="font-mono">₹{profitAndLossData.grossProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 8. Balance Sheet */}
          {activeTab === 'BALANCE_SHEET' && balanceSheetData && (
            <div className="p-6 max-w-3xl mx-auto space-y-4 text-xs w-full">
              <h2 className="text-sm font-bold text-slate-900 text-center border-b border-slate-200 pb-2">
                Balance Sheet (As of {balanceSheetData.asOfDate})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Assets Column */}
                <div className="border border-slate-200 p-4 rounded-xl bg-white shadow-2xs space-y-3">
                  <h3 className="font-bold text-amber-800 uppercase text-[11px] border-b border-slate-200 pb-1">
                    Assets (₹)
                  </h3>
                  {balanceSheetData.assets.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="font-semibold text-slate-600">{sec.title}</div>
                      {sec.rows.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between pl-2 text-slate-800">
                          <span>{r.accountName}</span>
                          <span className="font-mono font-medium">₹{r.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t border-slate-100 pt-1 text-slate-900">
                        <span>Total {sec.title}:</span>
                        <span className="font-mono">₹{sec.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-slate-300 text-slate-900">
                    <span>Total Assets:</span>
                    <span className="font-mono text-amber-700">₹{balanceSheetData.totalAssets.toLocaleString()}</span>
                  </div>
                </div>

                {/* Liabilities & Capital Column */}
                <div className="border border-slate-200 p-4 rounded-xl bg-white shadow-2xs space-y-3">
                  <h3 className="font-bold text-amber-800 uppercase text-[11px] border-b border-slate-200 pb-1">
                    Liabilities & Capital (₹)
                  </h3>
                  {balanceSheetData.liabilities.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="font-semibold text-slate-600">{sec.title}</div>
                      {sec.rows.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between pl-2 text-slate-800">
                          <span>{r.accountName}</span>
                          <span className="font-mono font-medium">₹{r.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {balanceSheetData.capital.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1 pt-2">
                      <div className="font-semibold text-slate-600">{sec.title}</div>
                      {sec.rows.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between pl-2 text-slate-800">
                          <span>{r.accountName}</span>
                          <span className="font-mono font-medium">₹{r.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-slate-300 text-slate-900">
                    <span>Total Liabilities & Capital:</span>
                    <span className="font-mono text-amber-700">₹{balanceSheetData.totalLiabilitiesAndCapital.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. Bank Book */}
          {activeTab === 'BANK_BOOK' && (
            <>
              {(!bankBookData?.rows || bankBookData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Bank Book Records</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No bank transactions recorded between {startDate} and {endDate}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'))
                      setEndDate(dayjs().format('YYYY-MM-DD'))
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                  >
                    Reset to This Month
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Ref No</th>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3">Narration</th>
                      <th className="py-2.5 px-3 text-right">Bank In (₹)</th>
                      <th className="py-2.5 px-3 text-right">Bank Out (₹)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankBookData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{r.billNo}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.accountName}</td>
                        <td className="py-2 px-3 text-slate-500">{r.narration}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {r.bankIn > 0 ? `₹${r.bankIn.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          {r.bankOut > 0 ? `₹${r.bankOut.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{r.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Total:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{bankBookData.rows.reduce((acc: number, r: any) => acc + (r.bankIn || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                        ₹{bankBookData.rows.reduce((acc: number, r: any) => acc + (r.bankOut || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{(bankBookData.rows[bankBookData.rows.length - 1]?.runningBalance || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* 10. Returns Register */}
          {(activeTab === 'SALES_RETURN' || activeTab === 'PURCHASE_RETURN') && (
            <>
              {(!(activeTab === 'SALES_RETURN' ? salesReturnData?.rows : purchaseReturnData?.rows) ||
                (activeTab === 'SALES_RETURN' ? salesReturnData?.rows : purchaseReturnData?.rows).length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Returns Recorded</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No return entries found between {startDate} and {endDate}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Return No</th>
                      <th className="py-2.5 px-3">Original Invoice</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party</th>
                      <th className="py-2.5 px-2 text-center">Pcs</th>
                      <th className="py-2.5 px-2 text-right">Gross (g)</th>
                      <th className="py-2.5 px-3 text-right">Return Value (₹)</th>
                      <th className="py-2.5 px-3 text-right">Refund (₹)</th>
                      <th className="py-2.5 px-3 text-right">Adjustment (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(
                      (activeTab === 'SALES_RETURN' ? salesReturnData?.rows : purchaseReturnData?.rows) || []
                    ).map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.returnNumber}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{r.originalInvoiceNumber || '-'}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{r.returnDate}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.partyName}</td>
                        <td className="py-2 px-2 text-center font-mono">{r.totalPcs}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                          ₹{r.returnTotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                          ₹{r.refundAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">
                          ₹{r.adjustmentAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* 11. Advances */}
          {activeTab === 'ADVANCES' && (
            <>
              {(!advancesData?.rows || advancesData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Advances Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No customer advances recorded between {startDate} and {endDate}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Advance No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Advance Amount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Allocated (₹)</th>
                      <th className="py-2.5 px-3 text-right">Unallocated Balance (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advancesData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.advanceNumber}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{r.advanceDate}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.customerName}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{r.advanceAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                          ₹{r.allocatedAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                          ₹{r.balanceAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* 12. Stock Movements */}
          {activeTab === 'STOCK_MOVEMENT' && (
            <>
              {(!stockMovementData?.rows || stockMovementData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Stock Movements</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No inward/outward item movements found between {startDate} and {endDate}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Ref Bill No</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-2 text-center">Pcs Delta</th>
                      <th className="py-2.5 px-2 text-right">Gross (g)</th>
                      <th className="py-2.5 px-2 text-right">Fine (g)</th>
                      <th className="py-2.5 px-3">Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockMovementData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{r.sourceType}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.billNo}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.itemName}</td>
                        <td className={`py-2 px-2 text-center font-mono font-bold ${r.pcsDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.pcsDelta > 0 ? `+${r.pcsDelta}` : r.pcsDelta}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${r.grossWeightDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.grossWeightDelta > 0 ? `+${r.grossWeightDelta.toFixed(3)}` : r.grossWeightDelta.toFixed(3)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">{r.fineDelta.toFixed(3)}</td>
                        <td className="py-2 px-3 text-slate-500">{r.narration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* 13. Stock Valuation */}
          {activeTab === 'STOCK_VALUATION' && (
            <>
              {(!stockValuationData?.rows || stockValuationData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Inventory Items</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No active stock items found in inventory catalog.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Metal</th>
                      <th className="py-2.5 px-2 text-center">Stock Pcs</th>
                      <th className="py-2.5 px-2 text-right">Gross (g)</th>
                      <th className="py-2.5 px-2 text-right">Fine (g)</th>
                      <th className="py-2.5 px-2 text-right">Standard Rate</th>
                      <th className="py-2.5 px-3 text-right">Estimated Metal Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockValuationData.rows.map((r: any) => (
                      <tr key={r.itemId} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.itemName}</td>
                        <td className="py-2 px-3 text-slate-500">{r.categoryName || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">{r.metalType}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-900">{r.currentPcs}</td>
                        <td className="py-2 px-2 text-right font-mono font-medium">{r.currentGrossWeight.toFixed(3)}</td>
                        <td className="py-2 px-2 text-right font-mono font-medium">{r.currentFineWeight.toFixed(3)}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">₹{r.standardGoldRate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                          ₹{Math.round(r.estimatedMetalValue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Total Stock:
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        {stockValuationData.rows.reduce((acc: number, r: any) => acc + (r.currentPcs || 0), 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {stockValuationData.rows.reduce((acc: number, r: any) => acc + (r.currentGrossWeight || 0), 0).toFixed(3)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {stockValuationData.rows.reduce((acc: number, r: any) => acc + (r.currentFineWeight || 0), 0).toFixed(3)}
                      </td>
                      <td className="py-2.5 px-2 text-right">-</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        ₹{Math.round(stockValuationData.rows.reduce((acc: number, r: any) => acc + (r.estimatedMetalValue || 0), 0)).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* 14. Old Gold Receipts */}
          {activeTab === 'OLD_GOLD' && (
            <>
              {(!oldGoldData?.rows || oldGoldData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Old Gold Receipts</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No old gold entries found between {startDate} and {endDate}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-2 text-right">Gross (g)</th>
                      <th className="py-2.5 px-2 text-right">Fine (g)</th>
                      <th className="py-2.5 px-3 text-right">Net Valuation (₹)</th>
                      <th className="py-2.5 px-3 text-right">Exchange Applied (₹)</th>
                      <th className="py-2.5 px-3 text-right">Cash Paid (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {oldGoldData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.receiptNumber}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{r.receiptDate}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.customerName}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.fineWeight.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">₹{r.netValuation.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">₹{r.exchangeAppliedAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900">₹{r.cashPaidAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* 15. Metal Exchanges */}
          {activeTab === 'EXCHANGES' && (
            <>
              {(!exchangesData?.rows || exchangesData.rows.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                    <FiInbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">No Metal Exchanges</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-3">
                    No metal exchange vouchers found between {startDate} and {endDate}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Exchange No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Sales Invoice No</th>
                      <th className="py-2.5 px-3">Order No</th>
                      <th className="py-2.5 px-3 text-right">Exchange Applied (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exchangesData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.exchangeNumber}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{r.exchangeDate}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.customerName}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{r.salesInvoiceNumber || '-'}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{r.orderNumber || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          ₹{r.exchangeAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancialReportsHubScreen
