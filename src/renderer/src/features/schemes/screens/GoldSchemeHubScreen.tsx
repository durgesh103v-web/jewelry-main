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

type SchemeTab = 'ACCOUNTS' | 'SCHEMES' | 'DASHBOARD'

interface GoldSchemeHubScreenProps {
  onClose?: () => void
  initialTab?: SchemeTab
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
      setAccounts(accList)
      setSchemes(schList)
      setCustomers(custList || [])
      setDashboard(dash)
    } catch (err: any) {
      console.error('Error fetching scheme data:', err)
      setError(err.message || 'Failed to load data')
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
      setError(err.message || 'Failed to create scheme')
    }
  }

  // Enroll Customer
  const handleEnrollCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.scheme.enrollCustomer(enrollForm)
      setShowEnrollModal(false)
      setSuccessMsg('Customer enrolled in scheme successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Enrollment failed')
    }
  }

  // Pay Installment
  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.scheme.payInstallment(payForm)
      setShowPayModal(false)
      setSuccessMsg('Installment payment recorded successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Payment failed')
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
      setError(err.message || 'Redemption failed')
    }
  }

  // Refund Scheme
  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.scheme.refund(refundForm)
      setShowRefundModal(false)
      setSuccessMsg('Scheme cancellation and refund recorded successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Refund failed')
    }
  }

  // View Installments
  const handleViewInstallments = async (acc: SchemeAccountRecord) => {
    setSelectedAccount(acc)
    try {
      const insts = await window.api.scheme.getInstallments(acc.id)
      setInstallments(insts)
      setShowInstallmentsModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to load installments')
    }
  }

  // View Timeline
  const handleViewTimeline = async (acc: SchemeAccountRecord) => {
    setSelectedAccount(acc)
    try {
      const events = await window.api.scheme.getTimeline(acc.id)
      setTimelineEvents(events)
      setShowTimelineModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline')
    }
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-13 px-4 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight">
              Gold Savings Scheme, Kitty & Monthly Deposit Engine
            </h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'ACCOUNTS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Customer Accounts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SCHEMES')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'SCHEMES'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Scheme Master
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'DASHBOARD'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Scheme Dashboard
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
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs flex justify-between items-center">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        {/* 1. Customer Scheme Accounts Tab */}
        {activeTab === 'ACCOUNTS' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Filter Toolbar */}
            <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search account no, customer, mobile..."
                  className="w-64 h-8 px-3 text-xs bg-background border border-input rounded-lg"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-3 text-xs bg-background border border-input rounded-lg"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="MATURED">Matured</option>
                  <option value="REDEEMED">Redeemed</option>
                  <option value="CLOSED">Closed / Refunded</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(true)}
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-xs flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Enroll Customer</span>
                </button>
              </div>
            </div>

            {/* Accounts Table */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Account No</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Scheme</th>
                    <th className="py-2.5 px-2 text-center">Progress</th>
                    <th className="py-2.5 px-2 text-right">Total Paid (₹)</th>
                    <th className="py-2.5 px-2 text-right">Bonus (₹)</th>
                    <th className="py-2.5 px-2 text-right">Available Bal (₹)</th>
                    <th className="py-2.5 px-3 text-center">Maturity Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {accounts.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">{a.accountNumber}</td>
                      <td className="py-2 px-3 font-semibold">
                        <div>{a.customerName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{a.customerMobile || '-'}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-primary">{a.schemeName}</span>
                        <div className="text-[10px] text-muted-foreground">₹{a.installmentAmount.toLocaleString()}/mo</div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold">
                        {a.installmentsPaid} / {a.installmentsExpected}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium">{a.totalAmountPaid.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{a.bonusAmount.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-primary">
                        ₹{a.balanceAmount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[11px]">{a.maturityDate}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            a.status === 'ACTIVE'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : a.status === 'MATURED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : a.status === 'REDEEMED'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center space-x-1">
                        {a.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayForm((prev) => ({
                                ...prev,
                                schemeAccountId: a.id,
                                amount: a.installmentAmount
                              }))
                              setShowPayModal(true)
                            }}
                            className="px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-[11px] font-semibold"
                          >
                            Pay
                          </button>
                        )}
                        {(a.status === 'ACTIVE' || a.status === 'MATURED') && a.balanceAmount > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRedeemForm((prev) => ({
                                  ...prev,
                                  schemeAccountId: a.id,
                                  redeemedAmount: a.balanceAmount
                                }))
                                setShowRedeemModal(true)
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                            >
                              Redeem
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundForm((prev) => ({
                                  ...prev,
                                  schemeAccountId: a.id,
                                  refundAmount: a.totalAmountPaid
                                }))
                                setShowRefundModal(true)
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold"
                            >
                              Cancel/Refund
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleViewInstallments(a)}
                          className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-[11px] font-semibold"
                        >
                          Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewTimeline(a)}
                          className="px-2 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded text-[11px]"
                        >
                          📜
                        </button>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No customer scheme accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Scheme Master Tab */}
        {activeTab === 'SCHEMES' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Configured Gold Savings Schemes</span>
              <button
                type="button"
                onClick={() => setShowCreateSchemeModal(true)}
                className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-xs"
              >
                + Create New Scheme
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 overflow-auto">
              {schemes.map((s) => (
                <div key={s.id} className="bg-card p-4 rounded-xl border border-border space-y-3 shadow-sm text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{s.schemeName}</h3>
                      <div className="font-mono text-primary text-[11px]">{s.schemeCode}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {s.schemeType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                      Duration: <strong className="text-foreground">{s.durationMonths} Months</strong>
                    </div>
                    <div>
                      Fixed Installment:{' '}
                      <strong className="text-foreground">₹{s.fixedInstallmentAmount.toLocaleString()}</strong>
                    </div>
                    <div>
                      Bonus Rule: <strong className="text-primary">{s.bonusType}</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
                    {s.description || 'Customer savings scheme with maturity benefits.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Scheme Dashboard Tab */}
        {activeTab === 'DASHBOARD' && dashboard && (
          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            <div className="grid grid-cols-4 gap-4 text-xs max-w-5xl mx-auto w-full">
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Active Schemes</div>
                <div className="text-2xl font-bold font-mono text-primary mt-1">{dashboard.activeSchemes}</div>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Installments Due This Month</div>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {dashboard.dueThisMonth}
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Overdue Installments</div>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  {dashboard.overdueInstallments}
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Matured Accounts</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {dashboard.maturedSchemes}
                </div>
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border max-w-5xl mx-auto w-full space-y-3 text-xs">
              <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
                Scheme Financial Liability Overview
              </h3>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="bg-muted/40 p-3 rounded-lg border border-border">
                  <div className="text-muted-foreground font-semibold">Total Deposits Collected</div>
                  <div className="text-xl font-bold font-mono text-foreground mt-1">
                    ₹{dashboard.totalDeposits.toLocaleString()}
                  </div>
                </div>
                <div className="bg-muted/40 p-3 rounded-lg border border-border">
                  <div className="text-muted-foreground font-semibold">Total Redemptions</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{dashboard.totalRedemptions.toLocaleString()}
                  </div>
                </div>
                <div className="bg-muted/40 p-3 rounded-lg border border-border">
                  <div className="text-muted-foreground font-semibold">Current Scheme Liability</div>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    ₹{dashboard.totalSchemeLiability.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE SCHEME MODAL */}
      {showCreateSchemeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Create New Gold Savings Scheme
            </h2>
            <form onSubmit={handleCreateScheme} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Scheme Name:</label>
                <input
                  type="text"
                  value={schemeForm.schemeName}
                  onChange={(e) => setSchemeForm({ ...schemeForm, schemeName: e.target.value })}
                  placeholder="e.g. Swarna Varsha 11+1 Scheme"
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Scheme Type:</label>
                  <select
                    value={schemeForm.schemeType}
                    onChange={(e) => setSchemeForm({ ...schemeForm, schemeType: e.target.value as SchemeType })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-semibold"
                  >
                    <option value="MONEY_BASED">Money Based (₹)</option>
                    <option value="GOLD_WEIGHT_BASED">Gold Weight Based (Grams)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Duration (Months):</label>
                  <input
                    type="number"
                    min="1"
                    value={schemeForm.durationMonths}
                    onChange={(e) => setSchemeForm({ ...schemeForm, durationMonths: parseInt(e.target.value) || 11 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Fixed Monthly Amount (₹):</label>
                  <input
                    type="number"
                    value={schemeForm.fixedInstallmentAmount}
                    onChange={(e) =>
                      setSchemeForm({ ...schemeForm, fixedInstallmentAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Bonus Type:</label>
                  <select
                    value={schemeForm.bonusType}
                    onChange={(e) => setSchemeForm({ ...schemeForm, bonusType: e.target.value as SchemeBonusType })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  >
                    <option value="ONE_MONTH_INSTALLMENT">1 Month Free Installment</option>
                    <option value="PERCENTAGE">Percentage Benefit</option>
                    <option value="FIXED_AMOUNT">Fixed Bonus Cash</option>
                    <option value="NONE">No Bonus</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateSchemeModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Save Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL MODAL */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Enroll Customer into Scheme
            </h2>
            <form onSubmit={handleEnrollCustomer} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Customer:</label>
                <select
                  value={enrollForm.customerId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, customerId: e.target.value })}
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile || 'No mobile'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Scheme:</label>
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
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg font-semibold"
                >
                  <option value="">Select Scheme</option>
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.schemeName} ({s.durationMonths} Mo - ₹{s.fixedInstallmentAmount.toLocaleString()}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Start Date:</label>
                  <input
                    type="date"
                    value={enrollForm.startDate}
                    onChange={(e) => setEnrollForm({ ...enrollForm, startDate: e.target.value })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Monthly Installment (₹):</label>
                  <input
                    type="number"
                    value={enrollForm.installmentAmount}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, installmentAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY INSTALLMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Record Monthly Installment Payment
            </h2>
            <form onSubmit={handlePayInstallment} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Payment Amount (₹):</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Payment Method:</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CARD">Card</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Paid Date:</label>
                  <input
                    type="date"
                    value={payForm.paidDate}
                    onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REDEEM MODAL */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Redeem Scheme Balance for Purchase
            </h2>
            <form onSubmit={handleRedeem} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Redeem Amount (₹):</label>
                <input
                  type="number"
                  value={redeemForm.redeemedAmount}
                  onChange={(e) =>
                    setRedeemForm({ ...redeemForm, redeemedAmount: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                >
                  Confirm Redemption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Cancel Scheme & Issue Refund
            </h2>
            <form onSubmit={handleRefund} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Refund Amount (₹):</label>
                <input
                  type="number"
                  value={refundForm.refundAmount}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, refundAmount: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold text-rose-600 dark:text-rose-400"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Payment Method:</label>
                <select
                  value={refundForm.paymentMethod}
                  onChange={(e) => setRefundForm({ ...refundForm, paymentMethod: e.target.value })}
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="UPI">UPI / QR</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
                >
                  Confirm Refund & Close Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSTALLMENTS LEDGER MODAL */}
      {showInstallmentsModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-2xl w-full shadow-2xl space-y-4 text-xs max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Installment Ledger: {selectedAccount.accountNumber}
                </h2>
                <div className="text-muted-foreground text-[11px]">
                  Customer: <strong>{selectedAccount.customerName}</strong> | Scheme:{' '}
                  <strong>{selectedAccount.schemeName}</strong>
                </div>
              </div>
              <button onClick={() => setShowInstallmentsModal(false)} className="text-xs font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-2">Month</th>
                    <th className="py-2 px-2">Due Date</th>
                    <th className="py-2 px-2 text-right">Due (₹)</th>
                    <th className="py-2 px-2 text-right">Paid (₹)</th>
                    <th className="py-2 px-2">Paid Date</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {installments.map((i) => (
                    <tr key={i.id} className="hover:bg-muted/20">
                      <td className="py-2 px-2 font-mono font-bold">#{i.installmentNumber}</td>
                      <td className="py-2 px-2 font-mono text-muted-foreground">{i.dueDate}</td>
                      <td className="py-2 px-2 text-right font-mono">{i.dueAmount.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-primary">
                        {i.paidAmount > 0 ? i.paidAmount.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-2 font-mono text-[11px]">{i.paidDate || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            i.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : i.status === 'OVERDUE'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-muted text-muted-foreground'
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
      )}

      {/* TIMELINE MODAL */}
      {showTimelineModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h2 className="text-sm font-bold text-foreground">
                Scheme History: {selectedAccount.accountNumber}
              </h2>
              <button onClick={() => setShowTimelineModal(false)} className="text-xs font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-auto space-y-3">
              {timelineEvents.map((ev) => (
                <div key={ev.id} className="border-l-2 border-primary/40 pl-3 py-1 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono">{ev.createdAt}</span>
                    <span className="font-bold text-foreground">{ev.eventType}</span>
                  </div>
                  <div className="text-foreground">{ev.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GoldSchemeHubScreen
