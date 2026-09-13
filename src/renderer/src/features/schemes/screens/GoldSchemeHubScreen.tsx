import React, { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import type {
  SchemeMasterRecord,
  SchemeAccountRecord,
  SchemeInstallmentRecord,
  SchemeTimelineEventRecord,
  SchemeDashboardSummary,
  SchemeType,
  SchemeBonusType
} from '@shared/types/scheme'
import { formatDate, formatCurrency } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type SchemeTab = 'ACCOUNTS' | 'SCHEMES' | 'DASHBOARD'

interface GoldSchemeHubScreenProps {
  onClose?: () => void
  initialTab?: SchemeTab
}

// Formatters for human-friendly scheme labels
function formatBonusType(bonusType: SchemeBonusType | string): string {
  switch (bonusType) {
    case 'ONE_MONTH_INSTALLMENT':
      return '1 Month Free Installment (Showroom Gift)'
    case 'PERCENTAGE':
      return 'Percentage Yield Bonus'
    case 'FIXED_AMOUNT':
      return 'Fixed Cash Bonus Voucher'
    case 'NONE':
      return 'No Bonus (Standard Savings)'
    default:
      return bonusType || 'Store Bonus'
  }
}

function formatSchemeType(type: SchemeType | string): string {
  switch (type) {
    case 'MONEY_BASED':
      return 'Fixed Monthly (₹)'
    case 'GOLD_WEIGHT_BASED':
      return 'Gold Weight Accumulator (g)'
    default:
      return type || 'Monthly Plan'
  }
}

export const GoldSchemeHubScreen: React.FC<GoldSchemeHubScreenProps> = ({
  onClose,
  initialTab = 'ACCOUNTS'
}) => {
  const [activeTab, setActiveTab] = useState<SchemeTab>(initialTab)
  const [accounts, setAccounts] = useState<SchemeAccountRecord[]>([])
  const [schemes, setSchemes] = useState<SchemeMasterRecord[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<SchemeDashboardSummary | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [schemeFilter, setSchemeFilter] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modals
  const [showCreateSchemeModal, setShowCreateSchemeModal] = useState<boolean>(false)
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false)
  const [showPayModal, setShowPayModal] = useState<boolean>(false)
  const [showRedeemModal, setShowRedeemModal] = useState<boolean>(false)
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false)
  const [showInstallmentsModal, setShowInstallmentsModal] = useState<boolean>(false)
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false)

  const [selectedAccount, setSelectedAccount] = useState<SchemeAccountRecord | null>(null)
  const [installments, setInstallments] = useState<SchemeInstallmentRecord[]>([])
  const [timelineEvents, setTimelineEvents] = useState<SchemeTimelineEventRecord[]>([])

  // Create Scheme Form
  const [schemeForm, setSchemeForm] = useState({
    schemeName: '',
    schemeType: 'MONEY_BASED' as SchemeType,
    durationMonths: 11,
    installmentType: 'FIXED' as 'FIXED' | 'VARIABLE',
    fixedInstallmentAmount: 5000,
    bonusType: 'ONE_MONTH_INSTALLMENT' as SchemeBonusType,
    bonusValue: 0,
    description: '11 Months Installment + 1 Month Store Bonus'
  })

  // Enroll Form
  const [enrollForm, setEnrollForm] = useState({
    schemeId: '',
    customerId: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    installmentAmount: 5000,
    notes: ''
  })

  // Pay Form
  const [payForm, setPayForm] = useState({
    schemeAccountId: '',
    amount: 5000,
    paymentMethod: 'CASH',
    paymentReference: '',
    paidDate: dayjs().format('YYYY-MM-DD'),
    notes: ''
  })

  // Redeem Form
  const [redeemForm, setRedeemForm] = useState({
    schemeAccountId: '',
    redeemedAmount: 0,
    salesInvoiceId: '',
    notes: ''
  })

  // Refund Form
  const [refundForm, setRefundForm] = useState({
    schemeAccountId: '',
    refundAmount: 0,
    deductionAmount: 0,
    paymentMethod: 'CASH',
    paymentReference: '',
    notes: ''
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [accList, schList, custList, dash] = await Promise.all([
        window.api.scheme.listAccounts({ status: statusFilter, search }),
        window.api.scheme.listSchemes(),
        window.api.customers.list(),
        window.api.scheme.getDashboard()
      ])
      setAccounts(accList || [])
      setSchemes(schList || [])
      setCustomers(custList || [])
      setDashboard(dash)
    } catch (err: any) {
      console.error('Error fetching scheme data:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Create Scheme
  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.scheme.createScheme(schemeForm)
      setShowCreateSchemeModal(false)
      setSuccessMsg('Gold savings scheme created successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Enroll Customer
  const handleEnrollCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollForm.customerId) {
      setError('Please select a customer to enroll.')
      return
    }
    if (!enrollForm.schemeId) {
      setError('Please select a scheme plan.')
      return
    }
    try {
      await window.api.scheme.enrollCustomer(enrollForm)
      setShowEnrollModal(false)
      setSuccessMsg('Customer enrolled in gold savings scheme successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Open enroll for specific scheme
  const handleEnrollWithScheme = (sch: SchemeMasterRecord) => {
    setEnrollForm({
      schemeId: sch.id,
      customerId: '',
      startDate: dayjs().format('YYYY-MM-DD'),
      installmentAmount: sch.fixedInstallmentAmount || 5000,
      notes: ''
    })
    setShowEnrollModal(true)
  }

  // Pay Installment
  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.scheme.payInstallment(payForm)
      setShowPayModal(false)
      setSuccessMsg('Monthly installment payment recorded successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Redeem Scheme
  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.scheme.redeem(redeemForm)
      setShowRedeemModal(false)
      setSuccessMsg('Scheme balance redeemed successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Refund / Cancel Scheme
  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.scheme.refund(refundForm)
      setShowRefundModal(false)
      setSuccessMsg('Scheme closed and refund recorded successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // View Installments
  const handleViewInstallments = async (acc: SchemeAccountRecord) => {
    setSelectedAccount(acc)
    try {
      const list = await window.api.scheme.getInstallments(acc.id)
      setInstallments(list || [])
      setShowInstallmentsModal(true)
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // View Timeline
  const handleViewTimeline = async (acc: SchemeAccountRecord) => {
    setSelectedAccount(acc)
    try {
      const events = await window.api.scheme.getTimeline(acc.id)
      setTimelineEvents(events || [])
      setShowTimelineModal(true)
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Filtered accounts
  const filteredAccounts = accounts.filter((a) => {
    if (schemeFilter !== 'ALL' && a.schemeId !== schemeFilter) return false
    return true
  })

  // Selected entities helper
  const selectedEnrollCustomer = customers.find((c) => c.id === enrollForm.customerId)
  const selectedEnrollScheme = schemes.find((s) => s.id === enrollForm.schemeId)

  // KPI Calculations
  const totalActive = accounts.filter((a) => a.status === 'ACTIVE').length
  const totalMatured = accounts.filter((a) => a.status === 'MATURED').length
  const totalCollections = accounts.reduce((acc, a) => acc + (a.totalAmountPaid || 0), 0)
  const totalBonus = accounts.reduce((acc, a) => acc + (a.bonusAmount || 0), 0)

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* ── Top Header Bar ── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Gold Savings Scheme &amp; Kitty Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
              Savings Register
            </span>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center gap-3">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`px-3.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'ACCOUNTS'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Accounts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SCHEMES')}
              className={`px-3.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'SCHEMES'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scheme Master
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DASHBOARD')}
              className={`px-3.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'DASHBOARD'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scheme Analytics
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="h-8 px-3.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reload Scheme Data"
          >
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          {activeTab === 'ACCOUNTS' && (
            <button
              type="button"
              onClick={() => {
                setEnrollForm({
                  schemeId: schemes[0]?.id || '',
                  customerId: '',
                  startDate: dayjs().format('YYYY-MM-DD'),
                  installmentAmount: schemes[0]?.fixedInstallmentAmount || 5000,
                  notes: ''
                })
                setShowEnrollModal(true)
              }}
              className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <span>+</span>
              <span>Enroll Customer</span>
            </button>
          )}

          {activeTab === 'SCHEMES' && (
            <button
              type="button"
              onClick={() => setShowCreateSchemeModal(true)}
              className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <span>+</span>
              <span>New Scheme Master</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Screen"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Main Workspace Body ── */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex justify-between items-center shadow-2xs">
            <span>✓ {successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* ── 1. CUSTOMER ACCOUNTS TAB ── */}
        {activeTab === 'ACCOUNTS' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Standard 4-KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Accounts
                </span>
                <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {totalActive}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">Running monthly plans</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Total Deposits Collected
                </span>
                <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                  {formatCurrency(totalCollections)}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">Cumulative customer savings</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Accrued Bonus Liability
                </span>
                <p className="text-2xl font-black text-amber-700 font-mono mt-1">
                  {formatCurrency(totalBonus)}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">Showroom reward commitment</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Matured / Redeemable
                </span>
                <p className="text-2xl font-black text-blue-700 font-mono mt-1">
                  {totalMatured}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">Ready for POS jewellery purchase</span>
              </div>
            </div>

            {/* Status Tabs Bar */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 shrink-0">
              {[
                { key: 'ALL', label: 'All Accounts' },
                { key: 'ACTIVE', label: 'Active (Running)' },
                { key: 'MATURED', label: 'Matured' },
                { key: 'REDEEMED', label: 'Redeemed' },
                { key: 'CLOSED', label: 'Closed / Refunded' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-amber-500 !text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search account #, customer name, mobile..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <select
                  value={schemeFilter}
                  onChange={(e) => setSchemeFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                >
                  <option value="ALL">All Schemes</option>
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.schemeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-900">{filteredAccounts.length}</strong> scheme account(s)
              </div>
            </div>

            {/* Accounts Data Table */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">Account #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Scheme Plan</th>
                    <th className="py-2.5 px-2 text-center">Progress</th>
                    <th className="py-2.5 px-2 text-right">Total Paid (₹)</th>
                    <th className="py-2.5 px-2 text-right">Bonus (₹)</th>
                    <th className="py-2.5 px-2 text-right">Redeemable Bal (₹)</th>
                    <th className="py-2.5 px-3 text-center">Maturity Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAccounts.map((a) => {
                    const pct = Math.min(100, Math.round((a.installmentsPaid / (a.installmentsExpected || 1)) * 100))
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{a.accountNumber}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{a.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            {(a as any).customerCode && (
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-semibold text-slate-700">
                                {(a as any).customerCode}
                              </span>
                            )}
                            <span>{a.customerMobile || '-'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-amber-900 block">{a.schemeName}</span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatCurrency(a.installmentAmount)} / month
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="font-mono font-bold text-slate-800 text-xs">
                            {a.installmentsPaid} / {a.installmentsExpected}
                          </div>
                          <div className="w-16 mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                a.status === 'MATURED' || pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(a.totalAmountPaid)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">
                          +{formatCurrency(a.bonusAmount)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-extrabold text-amber-800">
                          {formatCurrency(a.balanceAmount)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600 font-medium">
                          {formatDate(a.maturityDate)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              a.status === 'ACTIVE'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : a.status === 'MATURED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : a.status === 'REDEEMED'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {a.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAccount(a)
                                  setPayForm({
                                    schemeAccountId: a.id,
                                    amount: a.installmentAmount,
                                    paymentMethod: 'CASH',
                                    paymentReference: '',
                                    paidDate: dayjs().format('YYYY-MM-DD'),
                                    notes: ''
                                  })
                                  setShowPayModal(true)
                                }}
                                className="h-7 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white rounded-md text-[11px] font-bold shadow-2xs cursor-pointer transition-all"
                                style={{ color: '#ffffff' }}
                                title="Pay Monthly Installment"
                              >
                                Pay
                              </button>
                            )}

                            {(a.status === 'ACTIVE' || a.status === 'MATURED') && a.balanceAmount > 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAccount(a)
                                    setRedeemForm({
                                      schemeAccountId: a.id,
                                      redeemedAmount: a.balanceAmount,
                                      salesInvoiceId: '',
                                      notes: ''
                                    })
                                    setShowRedeemModal(true)
                                  }}
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 !text-white rounded-md text-[11px] font-bold shadow-2xs cursor-pointer transition-all"
                                  style={{ color: '#ffffff' }}
                                  title="Redeem balance against purchase"
                                >
                                  Redeem
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAccount(a)
                                    setRefundForm({
                                      schemeAccountId: a.id,
                                      refundAmount: a.totalAmountPaid,
                                      deductionAmount: 0,
                                      paymentMethod: 'CASH',
                                      paymentReference: '',
                                      notes: ''
                                    })
                                    setShowRefundModal(true)
                                  }}
                                  className="h-7 px-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-md text-[11px] font-semibold cursor-pointer transition-colors"
                                  title="Early cancellation / refund"
                                >
                                  Refund
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => handleViewInstallments(a)}
                              className="h-7 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[11px] font-semibold shadow-2xs cursor-pointer transition-colors"
                              title="View Installment Ledger"
                            >
                              Ledger
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewTimeline(a)}
                              className="h-7 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[11px] shadow-2xs cursor-pointer transition-colors"
                              title="Audit Timeline"
                            >
                              📜
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredAccounts.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <p className="text-sm font-bold text-slate-800">No scheme accounts found</p>
                          <p className="text-xs text-slate-500">
                            Enroll customer into a monthly gold accumulation plan to get started.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowEnrollModal(true)}
                            className="mt-2 h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                            style={{ color: '#ffffff' }}
                          >
                            + Enroll Customer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 2. SCHEME MASTER TAB ── */}
        {activeTab === 'SCHEMES' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  Configured Gold Savings Schemes ({schemes.length})
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Monthly installment plans with store maturity reward benefits
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateSchemeModal(true)}
                className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
                style={{ color: '#ffffff' }}
              >
                <span>+</span>
                <span>Create New Scheme</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto pb-4">
              {schemes.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between transition-all hover:border-amber-300"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{s.schemeName}</h3>
                        <div className="font-mono text-amber-800 font-bold text-[11px] mt-0.5">{s.schemeCode}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {formatSchemeType(s.schemeType)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Duration</span>
                        <strong className="text-slate-900 font-bold">{s.durationMonths} Months</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Installment</span>
                        <strong className="text-slate-900 font-mono font-bold">
                          {formatCurrency(s.fixedInstallmentAmount)}
                        </strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Store Bonus Benefit</span>
                        <strong className="text-emerald-700 font-bold text-[11px]">
                          {formatBonusType(s.bonusType)}
                        </strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed min-h-[32px]">
                      {s.description || 'Customer savings scheme with showroom maturity benefits.'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Total: {formatCurrency(s.durationMonths * s.fixedInstallmentAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEnrollWithScheme(s)}
                      className="h-7 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-md text-[11px] font-bold shadow-2xs cursor-pointer transition-colors"
                    >
                      + Enroll Customer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. SCHEME ANALYTICS / DASHBOARD TAB ── */}
        {activeTab === 'DASHBOARD' && dashboard && (
          <div className="flex-1 flex flex-col gap-4 overflow-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs max-w-6xl mx-auto w-full">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Active Enrolled Schemes</div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">{dashboard.activeSchemes}</div>
                <span className="text-[10px] text-slate-400 mt-0.5">Live running customer accounts</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-amber-700 font-bold uppercase text-[10px]">Due This Month</div>
                <div className="text-2xl font-black font-mono text-amber-800 mt-1">
                  {dashboard.dueThisMonth}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Upcoming monthly collection</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-rose-700 font-bold uppercase text-[10px]">Overdue Installments</div>
                <div className="text-2xl font-black font-mono text-rose-700 mt-1">
                  {dashboard.overdueInstallments}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Pending reminder calls</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-emerald-700 font-bold uppercase text-[10px]">Matured Accounts</div>
                <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                  {dashboard.maturedSchemes}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Ready for jewellery purchase</span>
              </div>
            </div>

            {/* Financial Liability & Deposit Overview */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 max-w-6xl mx-auto w-full space-y-4 text-xs shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Scheme Financial Liability &amp; Deposit Overview
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Aggregate financial ledger for all running customer savings schemes
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-bold text-[11px] uppercase">Total Deposits Collected</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                    {formatCurrency(dashboard.totalDeposits)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Customer monthly cash inflows</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-bold text-[11px] uppercase">Total Redemptions Applied</div>
                  <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                    {formatCurrency(dashboard.totalRedemptions)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Settled against POS jewelry bills</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-bold text-[11px] uppercase">Current Scheme Net Liability</div>
                  <div className="text-2xl font-black font-mono text-amber-800 mt-1">
                    {formatCurrency(dashboard.totalSchemeLiability)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Net store obligation to depositors</div>
                </div>
              </div>

              {/* Scheme Distribution Table */}
              <div className="pt-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Plan-Wise Performance Breakdown
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Scheme Plan</th>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3 text-center">Duration</th>
                        <th className="py-2.5 px-3 text-right">Installment (₹)</th>
                        <th className="py-2.5 px-3 text-center">Active Enrolled</th>
                        <th className="py-2.5 px-3">Store Bonus Benefit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {schemes.map((s) => {
                        const enrolledCount = accounts.filter((a) => a.schemeId === s.id && a.status === 'ACTIVE').length
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{s.schemeName}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-800 text-[11px]">{s.schemeCode}</td>
                            <td className="py-2.5 px-3 text-center font-medium">{s.durationMonths} Months</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(s.fixedInstallmentAmount)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                {enrolledCount} accounts
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-emerald-700 font-semibold">{formatBonusType(s.bonusType)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE SCHEME MODAL ── */}
      {showCreateSchemeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>✨</span>
                  <span>Create New Gold Savings Scheme</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Define installment tenure, monthly deposit, and showroom bonus</p>
              </div>
              <button
                onClick={() => setShowCreateSchemeModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateScheme} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Scheme Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={schemeForm.schemeName}
                  onChange={(e) => setSchemeForm({ ...schemeForm, schemeName: e.target.value })}
                  placeholder="e.g. Swarna Varsha 11+1 Monthly Plan"
                  required
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Scheme Type:</label>
                  <select
                    value={schemeForm.schemeType}
                    onChange={(e) => setSchemeForm({ ...schemeForm, schemeType: e.target.value as SchemeType })}
                    className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                  >
                    <option value="MONEY_BASED">Money Based (₹)</option>
                    <option value="GOLD_WEIGHT_BASED">Gold Weight (Grams)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Duration (Months):</label>
                  <input
                    type="number"
                    min="1"
                    value={schemeForm.durationMonths}
                    onChange={(e) => setSchemeForm({ ...schemeForm, durationMonths: parseInt(e.target.value) || 11 })}
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Monthly Installment (₹):</label>
                  <input
                    type="number"
                    value={schemeForm.fixedInstallmentAmount}
                    onChange={(e) =>
                      setSchemeForm({ ...schemeForm, fixedInstallmentAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bonus Benefit:</label>
                  <select
                    value={schemeForm.bonusType}
                    onChange={(e) => setSchemeForm({ ...schemeForm, bonusType: e.target.value as SchemeBonusType })}
                    className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                  >
                    <option value="ONE_MONTH_INSTALLMENT">1 Month Free Installment</option>
                    <option value="PERCENTAGE">Percentage Benefit</option>
                    <option value="FIXED_AMOUNT">Fixed Bonus Cash</option>
                    <option value="NONE">No Bonus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Marketing Description:</label>
                <textarea
                  rows={2}
                  value={schemeForm.description}
                  onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
                  placeholder="Terms and maturity benefits description..."
                  className="w-full p-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSchemeModal(false)}
                  className="h-8.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  Save Scheme Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ENROLL CUSTOMER MODAL (Screenshot 1 Improvement) ── */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🪙</span>
                  <span>Enroll Customer into Gold Scheme</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Set up monthly gold deposit savings account for customer
                </p>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollCustomer} className="p-6 space-y-4 text-xs">
              {/* Customer Select */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={enrollForm.customerId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, customerId: e.target.value })}
                  required
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.customerCode ? `(${c.customerCode})` : ''} {c.mobile ? `- ${c.mobile}` : ''}
                    </option>
                  ))}
                </select>
                {selectedEnrollCustomer && (
                  <div className="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
                    <span>
                      Customer: <strong className="text-slate-900">{selectedEnrollCustomer.name}</strong>
                    </span>
                    <span className="font-mono text-slate-700">📱 {selectedEnrollCustomer.mobile || 'No Mobile'}</span>
                  </div>
                )}
              </div>

              {/* Scheme Select */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Scheme Plan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={enrollForm.schemeId}
                  onChange={(e) => {
                    const sch = schemes.find((s) => s.id === e.target.value)
                    setEnrollForm({
                      ...enrollForm,
                      schemeId: e.target.value,
                      installmentAmount: sch?.fixedInstallmentAmount || 5000
                    })
                  }}
                  required
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                >
                  <option value="">-- Select Scheme --</option>
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.schemeName} ({s.durationMonths} Mo • {formatCurrency(s.fixedInstallmentAmount)}/mo)
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheme Summary Preview Card */}
              {selectedEnrollScheme && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-[11px]">
                  <div className="flex justify-between items-center font-bold text-amber-900 border-b border-amber-200/60 pb-1">
                    <span>Plan: {selectedEnrollScheme.schemeName}</span>
                    <span className="font-mono text-[10px] bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                      {selectedEnrollScheme.schemeCode}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-500">Tenure:</span>{' '}
                      <strong>{selectedEnrollScheme.durationMonths} Months</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Monthly Deposit:</span>{' '}
                      <strong className="font-mono">{formatCurrency(enrollForm.installmentAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Customer Contribution:</span>{' '}
                      <strong className="font-mono text-slate-900">
                        {formatCurrency(selectedEnrollScheme.durationMonths * enrollForm.installmentAmount)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Showroom Bonus:</span>{' '}
                      <strong className="text-emerald-700 font-bold">
                        {formatBonusType(selectedEnrollScheme.bonusType)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Installment Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Date:</label>
                  <input
                    type="date"
                    value={enrollForm.startDate}
                    onChange={(e) => setEnrollForm({ ...enrollForm, startDate: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Monthly Installment (₹):</label>
                  <input
                    type="number"
                    value={enrollForm.installmentAmount}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, installmentAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="h-8.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                  style={{ color: '#ffffff' }}
                >
                  <span>✓</span>
                  <span>Confirm Enrollment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PAY INSTALLMENT MODAL ── */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>💳</span>
                  <span>Record Monthly Installment Payment</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {selectedAccount ? `${selectedAccount.accountNumber} • ${selectedAccount.customerName}` : 'Deposit Installment'}
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePayInstallment} className="p-6 space-y-4 text-xs">
              {selectedAccount && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Scheme Plan:</span>{' '}
                    <strong className="text-amber-900">{selectedAccount.schemeName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Installments Paid:</span>{' '}
                    <strong className="font-mono text-slate-900">
                      {selectedAccount.installmentsPaid} / {selectedAccount.installmentsExpected}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Deposited So Far:</span>{' '}
                    <strong className="font-mono text-slate-900">
                      {formatCurrency(selectedAccount.totalAmountPaid)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Expected Installment:</span>{' '}
                    <strong className="font-mono text-slate-900">
                      {formatCurrency(selectedAccount.installmentAmount)}
                    </strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full h-10 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Method:</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK">Bank Transfer / NEFT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Paid Date:</label>
                  <input
                    type="date"
                    value={payForm.paidDate}
                    onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Reference (UTR / Txn ID / Receipt #):</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/2026/09/98201 or Receipt #1042"
                  value={payForm.paymentReference}
                  onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="h-8.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                  style={{ color: '#ffffff' }}
                >
                  <span>✓</span>
                  <span>Record Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REDEEM MODAL (Screenshot 5 Improvement) ── */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🎁</span>
                  <span>Redeem Scheme Balance for Purchase</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Apply accumulated gold scheme balance against jewelry purchase
                </p>
              </div>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRedeem} className="p-6 space-y-4 text-xs">
              {/* Account Summary Banner */}
              {selectedAccount && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-[11px]">
                  <div className="flex justify-between items-center font-bold text-emerald-900 border-b border-emerald-200/60 pb-1">
                    <span>Account: {selectedAccount.accountNumber}</span>
                    <span className="font-normal text-emerald-800">{selectedAccount.customerName}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Total Paid:</span>
                      <strong className="font-mono text-slate-900 font-bold">
                        {formatCurrency(selectedAccount.totalAmountPaid)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Bonus Benefit:</span>
                      <strong className="font-mono text-emerald-700 font-bold">
                        +{formatCurrency(selectedAccount.bonusAmount)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Max Redeemable:</span>
                      <strong className="font-mono text-amber-800 font-extrabold text-xs">
                        {formatCurrency(selectedAccount.balanceAmount)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-700 font-bold">
                    Redeem Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  {selectedAccount && (
                    <button
                      type="button"
                      onClick={() =>
                        setRedeemForm((prev) => ({ ...prev, redeemedAmount: selectedAccount.balanceAmount }))
                      }
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                    >
                      Redeem Full ({formatCurrency(selectedAccount.balanceAmount)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={redeemForm.redeemedAmount}
                  onChange={(e) =>
                    setRedeemForm({ ...redeemForm, redeemedAmount: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="w-full h-10 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 text-emerald-700 font-mono font-extrabold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Sales Invoice / POS Bill Reference (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-0084 or Bill #"
                  value={redeemForm.salesInvoiceId}
                  onChange={(e) => setRedeemForm({ ...redeemForm, salesInvoiceId: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="h-8.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-5 bg-emerald-600 hover:bg-emerald-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                  style={{ color: '#ffffff' }}
                >
                  <span>✓</span>
                  <span>Confirm Redemption</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REFUND / CANCEL MODAL ── */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Cancel Scheme &amp; Issue Refund</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Early premature cancellation and deposit refund
                </p>
              </div>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRefund} className="p-6 space-y-4 text-xs">
              {selectedAccount && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-slate-700 space-y-1">
                  <div>
                    Account: <strong className="text-slate-900">{selectedAccount.accountNumber}</strong> (
                    {selectedAccount.customerName})
                  </div>
                  <div>
                    Total Deposit Paid: <strong className="font-mono text-slate-900">{formatCurrency(selectedAccount.totalAmountPaid)}</strong>
                  </div>
                  <div className="text-rose-700 font-semibold text-[10px]">
                    * Note: Premature cancellation revokes all bonus benefits.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Refund Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={refundForm.refundAmount}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, refundAmount: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="w-full h-10 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 text-rose-700 font-mono font-extrabold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Method:</label>
                <select
                  value={refundForm.paymentMethod}
                  onChange={(e) => setRefundForm({ ...refundForm, paymentMethod: e.target.value })}
                  className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI / QR Code</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="h-8.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-5 bg-rose-600 hover:bg-rose-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                  style={{ color: '#ffffff' }}
                >
                  <span>✓</span>
                  <span>Confirm Refund &amp; Close</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INSTALLMENTS LEDGER MODAL ── */}
      {showInstallmentsModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl space-y-4 text-xs max-h-[85vh] flex flex-col font-sans overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📖</span>
                  <span>Installment Ledger: {selectedAccount.accountNumber}</span>
                </h2>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Customer: <strong className="text-slate-900">{selectedAccount.customerName}</strong> | Scheme:{' '}
                  <strong className="text-amber-800">{selectedAccount.schemeName}</strong>
                </div>
              </div>
              <button
                onClick={() => setShowInstallmentsModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 pt-2 flex-1 overflow-auto">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] font-extrabold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Due (₹)</th>
                      <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                      <th className="py-2.5 px-3">Paid Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {installments.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">#{i.installmentNumber}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{formatDate(i.dueDate)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(i.dueAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {i.paidAmount > 0 ? formatCurrency(i.paidAmount) : '-'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{formatDate(i.paidDate)}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              i.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : i.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT TIMELINE MODAL ── */}
      {showTimelineModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs max-h-[80vh] flex flex-col font-sans overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📜</span>
                  <span>Scheme History: {selectedAccount.accountNumber}</span>
                </h2>
                <div className="text-slate-500 text-[11px] mt-0.5">{selectedAccount.customerName}</div>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 pt-2 flex-1 overflow-auto space-y-3">
              {timelineEvents.map((ev) => (
                <div key={ev.id} className="border-l-2 border-amber-500 pl-3 py-1 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span className="font-mono">{formatDate(ev.createdAt)}</span>
                    <span className="font-bold text-slate-800">{ev.eventType}</span>
                  </div>
                  <div className="text-slate-700 font-medium">{ev.description}</div>
                </div>
              ))}
              {timelineEvents.length === 0 && (
                <div className="text-center text-slate-400 py-6">No audit timeline records found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GoldSchemeHubScreen
