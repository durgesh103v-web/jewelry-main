import React, { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
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

  // Simple CSV Exporter helper
  const handleExportCsv = () => {
    let rows: any[] = []
    let filename = `${activeTab.toLowerCase()}_${startDate}_to_${endDate}.csv`

    if (activeTab === 'DAY_BOOK') rows = dayBookData?.rows || []
    else if (activeTab === 'CASH_BOOK') rows = cashBookData?.rows || []
    else if (activeTab === 'BANK_BOOK') rows = bankBookData?.rows || []
    else if (activeTab === 'SALES_REGISTER') rows = salesRegisterData?.rows || []
    else if (activeTab === 'PURCHASE_REGISTER') rows = purchaseRegisterData?.rows || []
    else if (activeTab === 'SALES_RETURN') rows = salesReturnData?.rows || []
    else if (activeTab === 'PURCHASE_RETURN') rows = purchaseReturnData?.rows || []
    else if (activeTab === 'CUSTOMER_OUTSTANDING') rows = customerOutstandingData?.rows || []
    else if (activeTab === 'SUPPLIER_OUTSTANDING') rows = supplierOutstandingData?.rows || []
    else if (activeTab === 'ADVANCES') rows = advancesData?.rows || []
    else if (activeTab === 'OLD_GOLD') rows = oldGoldData?.rows || []
    else if (activeTab === 'EXCHANGES') rows = exchangesData?.rows || []
    else if (activeTab === 'STOCK_MOVEMENT') rows = stockMovementData?.rows || []
    else if (activeTab === 'STOCK_VALUATION') rows = stockValuationData?.rows || []
    else if (activeTab === 'TRIAL_BALANCE') rows = trialBalanceData?.rows || []

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
          <span className="text-xl">📊</span>
          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight">
              Financial Reporting & Accounting Hub
            </h1>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setCategory('FINANCIAL')
              setActiveTab('DAY_BOOK')
            }}
            className={`px-3 py-1 rounded transition-colors ${
              category === 'FINANCIAL' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Financial Books
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('SALES')
              setActiveTab('SALES_REGISTER')
            }}
            className={`px-3 py-1 rounded transition-colors ${
              category === 'SALES' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sales
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('PURCHASE')
              setActiveTab('PURCHASE_REGISTER')
            }}
            className={`px-3 py-1 rounded transition-colors ${
              category === 'PURCHASE' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Purchases
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('PARTIES')
              setActiveTab('CUSTOMER_OUTSTANDING')
            }}
            className={`px-3 py-1 rounded transition-colors ${
              category === 'PARTIES' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Parties & Outstanding
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('INVENTORY')
              setActiveTab('STOCK_MOVEMENT')
            }}
            className={`px-3 py-1 rounded transition-colors ${
              category === 'INVENTORY' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Stock & Metals
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

      {/* Subtabs Bar */}
      <div className="bg-card/70 border-b border-border px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        {category === 'FINANCIAL' && (
          <>
            <button
              onClick={() => setActiveTab('DAY_BOOK')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'DAY_BOOK' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Day Book
            </button>
            <button
              onClick={() => setActiveTab('CASH_BOOK')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'CASH_BOOK' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Cash Book
            </button>
            <button
              onClick={() => setActiveTab('BANK_BOOK')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'BANK_BOOK' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Bank Book
            </button>
            <button
              onClick={() => setActiveTab('TRIAL_BALANCE')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'TRIAL_BALANCE' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Trial Balance
            </button>
            <button
              onClick={() => setActiveTab('PROFIT_LOSS')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'PROFIT_LOSS' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Profit & Loss
            </button>
            <button
              onClick={() => setActiveTab('BALANCE_SHEET')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'BALANCE_SHEET' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Balance Sheet
            </button>
          </>
        )}

        {category === 'SALES' && (
          <>
            <button
              onClick={() => setActiveTab('SALES_REGISTER')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'SALES_REGISTER' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Sales Register
            </button>
            <button
              onClick={() => setActiveTab('SALES_RETURN')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'SALES_RETURN' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Sales Returns & Credit Notes
            </button>
          </>
        )}

        {category === 'PURCHASE' && (
          <>
            <button
              onClick={() => setActiveTab('PURCHASE_REGISTER')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'PURCHASE_REGISTER' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Purchase Register
            </button>
            <button
              onClick={() => setActiveTab('PURCHASE_RETURN')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'PURCHASE_RETURN' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Purchase Returns & Debit Notes
            </button>
          </>
        )}

        {category === 'PARTIES' && (
          <>
            <button
              onClick={() => setActiveTab('CUSTOMER_OUTSTANDING')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'CUSTOMER_OUTSTANDING' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Customer Outstanding
            </button>
            <button
              onClick={() => setActiveTab('SUPPLIER_OUTSTANDING')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'SUPPLIER_OUTSTANDING' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Supplier Outstanding
            </button>
            <button
              onClick={() => setActiveTab('ADVANCES')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'ADVANCES' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Customer Advances
            </button>
          </>
        )}

        {category === 'INVENTORY' && (
          <>
            <button
              onClick={() => setActiveTab('STOCK_MOVEMENT')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'STOCK_MOVEMENT' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Stock Movement
            </button>
            <button
              onClick={() => setActiveTab('STOCK_VALUATION')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'STOCK_VALUATION' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Stock Valuation
            </button>
            <button
              onClick={() => setActiveTab('OLD_GOLD')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'OLD_GOLD' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Old Gold Receipts
            </button>
            <button
              onClick={() => setActiveTab('EXCHANGES')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'EXCHANGES' ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Metal Exchanges
            </button>
          </>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
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
          isLoading={isLoading}
        />

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Report Content Panel */}
        <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm flex flex-col">
          {/* 1. Day Book Table */}
          {activeTab === 'DAY_BOOK' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(dayBookData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                    <td className="py-2 px-3 font-mono font-medium text-foreground">{r.billNo}</td>
                    <td className="py-2 px-3 font-semibold">{r.accountName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.narration}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {r.cashNave > 0 ? `₹${r.cashNave.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.cashJama > 0 ? `₹${r.cashJama.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {r.bankNave > 0 ? `₹${r.bankNave.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.bankJama > 0 ? `₹${r.bankJama.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 2. Cash Book Table */}
          {activeTab === 'CASH_BOOK' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(cashBookData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                    <td className="py-2 px-3 font-mono font-medium">{r.billNo}</td>
                    <td className="py-2 px-3 font-semibold">{r.accountName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.narration}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.cashIn > 0 ? `₹${r.cashIn.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {r.cashOut > 0 ? `₹${r.cashOut.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      ₹{r.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 3. Sales Register */}
          {activeTab === 'SALES_REGISTER' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(salesRegisterData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.invoiceNumber}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{r.invoiceDate}</td>
                    <td className="py-2 px-3 font-semibold">{r.customerName || r.accountName}</td>
                    <td className="py-2 px-2 text-center font-mono">{r.totalPcs}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.fineWeight.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                      ₹{r.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{r.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                      ₹{r.balanceDue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 4. Purchase Register */}
          {activeTab === 'PURCHASE_REGISTER' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(purchaseRegisterData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.invoiceNumber}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{r.supplierInvoiceNumber || '-'}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{r.invoiceDate}</td>
                    <td className="py-2 px-3 font-semibold">{r.supplierName || r.accountName}</td>
                    <td className="py-2 px-2 text-center font-mono">{r.totalPcs}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                      ₹{r.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{r.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                      ₹{r.balanceDue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 5. Customer / Supplier Outstanding */}
          {(activeTab === 'CUSTOMER_OUTSTANDING' || activeTab === 'SUPPLIER_OUTSTANDING') && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(
                  (activeTab === 'CUSTOMER_OUTSTANDING'
                    ? customerOutstandingData?.rows
                    : supplierOutstandingData?.rows) || []
                ).map((r: any) => (
                  <tr key={r.accountId} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-semibold">{r.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.mobile || '-'}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.city || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono">₹{r.openingBalance.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono">₹{r.periodDebit.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono">₹{r.periodCredit.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      ₹{Math.abs(r.closingBalance).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          r.status === 'RECEIVABLE'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : r.status === 'PAYABLE'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-muted text-muted-foreground'
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

          {/* 6. Trial Balance */}
          {activeTab === 'TRIAL_BALANCE' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(trialBalanceData?.rows || []).map((r: any) => (
                  <tr key={r.accountId} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-semibold">{r.accountName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.groupName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.groupType}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium">
                      {r.periodDebit > 0 ? `₹${r.periodDebit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium">
                      {r.periodCredit > 0 ? `₹${r.periodCredit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {r.closingDebit > 0 ? `₹${r.closingDebit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {r.closingCredit > 0 ? `₹${r.closingCredit.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 7. Profit & Loss Statement */}
          {activeTab === 'PROFIT_LOSS' && profitAndLossData && (
            <div className="p-6 max-w-2xl mx-auto space-y-4 text-xs">
              <h2 className="text-sm font-bold text-foreground text-center border-b border-border pb-2">
                Profit & Loss Statement ({profitAndLossData.startDate} to {profitAndLossData.endDate})
              </h2>
              <div className="space-y-2 border border-border p-4 rounded-xl bg-card">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Gross Sales Revenue:</span>
                  <span className="font-mono font-bold text-foreground">₹{profitAndLossData.salesRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400">
                  <span>Less: Sales Returns & Credit Notes:</span>
                  <span className="font-mono font-bold">-₹{profitAndLossData.salesReturns.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-y border-border/60 font-bold text-primary">
                  <span>Net Sales Revenue:</span>
                  <span className="font-mono">₹{profitAndLossData.netSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Cost of Purchases:</span>
                  <span className="font-mono text-foreground">₹{profitAndLossData.costOfPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                  <span>Less: Purchase Returns:</span>
                  <span className="font-mono font-bold">-₹{profitAndLossData.purchaseReturns.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-y border-border/60 font-bold">
                  <span>Net Cost of Purchases:</span>
                  <span className="font-mono">₹{profitAndLossData.netPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-border font-black text-sm text-emerald-600 dark:text-emerald-400">
                  <span>Gross Operating Profit:</span>
                  <span className="font-mono">₹{profitAndLossData.grossProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 8. Balance Sheet */}
          {activeTab === 'BALANCE_SHEET' && balanceSheetData && (
            <div className="p-6 max-w-3xl mx-auto space-y-4 text-xs">
              <h2 className="text-sm font-bold text-foreground text-center border-b border-border pb-2">
                Balance Sheet (As of {balanceSheetData.asOfDate})
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Assets Column */}
                <div className="border border-border p-4 rounded-xl bg-card space-y-3">
                  <h3 className="font-bold text-primary uppercase text-[11px] border-b border-border pb-1">
                    Assets (₹)
                  </h3>
                  {balanceSheetData.assets.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="font-semibold text-muted-foreground">{sec.title}</div>
                      {sec.rows.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between pl-2 text-foreground">
                          <span>{r.accountName}</span>
                          <span className="font-mono font-medium">₹{r.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t border-border/40 pt-1">
                        <span>Total {sec.title}:</span>
                        <span className="font-mono">₹{sec.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-border text-foreground">
                    <span>Total Assets:</span>
                    <span className="font-mono">₹{balanceSheetData.totalAssets.toLocaleString()}</span>
                  </div>
                </div>

                {/* Liabilities & Capital Column */}
                <div className="border border-border p-4 rounded-xl bg-card space-y-3">
                  <h3 className="font-bold text-primary uppercase text-[11px] border-b border-border pb-1">
                    Liabilities & Capital (₹)
                  </h3>
                  {balanceSheetData.liabilities.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="font-semibold text-muted-foreground">{sec.title}</div>
                      {sec.rows.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between pl-2 text-foreground">
                          <span>{r.accountName}</span>
                          <span className="font-mono font-medium">₹{r.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {balanceSheetData.capital.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1 pt-2">
                      <div className="font-semibold text-muted-foreground">{sec.title}</div>
                      {sec.rows.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between pl-2 text-foreground">
                          <span>{r.accountName}</span>
                          <span className="font-mono font-medium">₹{r.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-border text-foreground">
                    <span>Total Liabilities & Capital:</span>
                    <span className="font-mono">₹{balanceSheetData.totalLiabilitiesAndCapital.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. Bank Book */}
          {activeTab === 'BANK_BOOK' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(bankBookData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                    <td className="py-2 px-3 font-mono font-medium">{r.billNo}</td>
                    <td className="py-2 px-3 font-semibold">{r.accountName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.narration}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.bankIn > 0 ? `₹${r.bankIn.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {r.bankOut > 0 ? `₹${r.bankOut.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      ₹{r.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 10. Returns Register */}
          {(activeTab === 'SALES_RETURN' || activeTab === 'PURCHASE_RETURN') && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(
                  (activeTab === 'SALES_RETURN' ? salesReturnData?.rows : purchaseReturnData?.rows) || []
                ).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.returnNumber}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{r.originalInvoiceNumber || '-'}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{r.returnDate}</td>
                    <td className="py-2 px-3 font-semibold">{r.partyName}</td>
                    <td className="py-2 px-2 text-center font-mono">{r.totalPcs}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                      ₹{r.returnTotal.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{r.refundAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">
                      ₹{r.adjustmentAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 11. Advances */}
          {activeTab === 'ADVANCES' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(advancesData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.advanceNumber}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{r.advanceDate}</td>
                    <td className="py-2 px-3 font-semibold">{r.customerName}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">₹{r.advanceAmount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{r.allocatedAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      ₹{r.balanceAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-muted text-muted-foreground">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 12. Stock Movements */}
          {activeTab === 'STOCK_MOVEMENT' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(stockMovementData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-[11px]">{r.entryDate}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{r.sourceType}</td>
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.billNo}</td>
                    <td className="py-2 px-3 font-semibold">{r.itemName}</td>
                    <td className={`py-2 px-2 text-center font-mono font-bold ${r.pcsDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {r.pcsDelta > 0 ? `+${r.pcsDelta}` : r.pcsDelta}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono font-bold ${r.grossWeightDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {r.grossWeightDelta > 0 ? `+${r.grossWeightDelta.toFixed(3)}` : r.grossWeightDelta.toFixed(3)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">{r.fineDelta.toFixed(3)}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.narration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 13. Stock Valuation */}
          {activeTab === 'STOCK_VALUATION' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(stockValuationData?.rows || []).map((r: any) => (
                  <tr key={r.itemId} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-semibold text-foreground">{r.itemName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.categoryName || '-'}</td>
                    <td className="py-2 px-3">{r.metalType}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold">{r.currentPcs}</td>
                    <td className="py-2 px-2 text-right font-mono font-medium">{r.currentGrossWeight.toFixed(3)}</td>
                    <td className="py-2 px-2 text-right font-mono font-medium">{r.currentFineWeight.toFixed(3)}</td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">₹{r.standardGoldRate.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                      ₹{Math.round(r.estimatedMetalValue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 14. Old Gold Receipts */}
          {activeTab === 'OLD_GOLD' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(oldGoldData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.receiptNumber}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{r.receiptDate}</td>
                    <td className="py-2 px-3 font-semibold">{r.customerName}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.grossWeight.toFixed(3)}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.fineWeight.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">₹{r.netValuation.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{r.exchangeAppliedAmount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">₹{r.cashPaidAmount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-muted text-muted-foreground">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 15. Metal Exchanges */}
          {activeTab === 'EXCHANGES' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
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
              <tbody className="divide-y divide-border/60">
                {(exchangesData?.rows || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{r.exchangeNumber}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{r.exchangeDate}</td>
                    <td className="py-2 px-3 font-semibold">{r.customerName}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{r.salesInvoiceNumber || '-'}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{r.orderNumber || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{r.exchangeAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-muted text-muted-foreground">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancialReportsHubScreen
