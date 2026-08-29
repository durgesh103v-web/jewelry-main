import React, { useEffect, useMemo, useState } from 'react'
import type { AppMenuChild } from '../../types/menu'

const emptyDailySummary: DailySummaryResult = {
  date: '',
  sales: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  purchases: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  saleReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  purchaseReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cashReceipts: { count: 0, amountTotal: 0 },
  cashPayments: { count: 0, amountTotal: 0 },
  approvals: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cash: { openingBalance: 0, totalReceipt: 0, totalPayment: 0, closingBalance: 0, netMovement: 0 },
  fine: { goldIn: 0, goldOut: 0, goldNet: 0, silverIn: 0, silverOut: 0, silverNet: 0 }
}

function formatDashboardNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

const quickActionItems: Array<{
  id: string
  label: string
  module: AppMenuChild['module']
  icon: string
  tileClass: string
}> = [
  { id: 'sale', label: 'Sale', module: 'transaction', icon: '\u{1F9FE}', tileClass: 'sale-tile' },
  {
    id: 'purchase',
    label: 'Purchase',
    module: 'transaction',
    icon: '\u{1F9BE}',
    tileClass: 'purchase-tile'
  },
  {
    id: 'cash-receipt-jama',
    label: 'Cash Receipt',
    module: 'transaction',
    icon: '\u{1F4B0}',
    tileClass: 'receipt-tile'
  },
  {
    id: 'cash-payment-nave',
    label: 'Cash Payment',
    module: 'transaction',
    icon: '\u{1F4B8}',
    tileClass: 'payment-tile'
  },
  {
    id: 'account-master',
    label: 'Accounts',
    module: 'master',
    icon: '\u{1F465}',
    tileClass: 'account-tile'
  },
  {
    id: 'item-master',
    label: 'Items',
    module: 'master',
    icon: '\u{1F48D}',
    tileClass: 'item-tile'
  },
  {
    id: 'account-balance',
    label: 'Reports',
    module: 'reports',
    icon: '\u{1F4CA}',
    tileClass: 'report-tile'
  },
  { id: 'backup', label: 'Backup', module: 'utility', icon: '\u{1F4BE}', tileClass: 'backup-tile' },
  {
    id: 'reminder',
    label: 'Reminder',
    module: 'utility',
    icon: '\u{1F514}',
    tileClass: 'reminder-tile'
  }
]

export interface DashboardScreenProps {
  openQuickScreen: (id: string, label: string, module: AppMenuChild['module']) => void
  visibleScreenIds: Set<string>
}

export function DashboardScreen({
  openQuickScreen,
  visibleScreenIds
}: DashboardScreenProps): React.JSX.Element {
  const [dailySummary, setDailySummary] = useState<DailySummaryResult>(emptyDailySummary)
  const [outstanding, setOutstanding] = useState<OutstandingReportResult | null>(null)
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      window.api.dailyReport.summary(),
      window.api.reports.outstanding(),
      window.api.reminder.list()
    ])
      .then(([summaryResult, outstandingResult, reminderResult]) => {
        if (cancelled) return
        setDailySummary(summaryResult)
        setOutstanding(outstandingResult)
        setReminders(reminderResult)
      })
      .catch(() => {
        // Dashboard degrades gracefully to zeroed KPI cards if any report fails to load.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const overdueReminders = useMemo(() => reminders.filter((item) => item.isOverdue), [reminders])
  const upcomingReminders = useMemo(
    () => reminders.filter((item) => !item.isOverdue).slice(0, 5),
    [reminders]
  )

  const filteredQuickActions = useMemo(() => {
    const allowed = quickActionItems.filter((item) => visibleScreenIds.has(item.id))
    const term = searchTerm.trim().toLowerCase()
    if (!term) return allowed
    return allowed.filter((item) => item.label.toLowerCase().includes(term))
  }, [searchTerm, visibleScreenIds])

  return (
    <div className="dashboard">
      <div className="dashboard-kpi-row">
        <div className="kpi-card kpi-sale">
          <span className="kpi-label">Today&apos;s Sale</span>
          <strong className="kpi-value">{dailySummary.sales.count} Bills</strong>
          <span className="kpi-sub">Majuri Rs. {formatDashboardNumber(dailySummary.sales.amountTotal)}</span>
        </div>

        <div className="kpi-card kpi-purchase">
          <span className="kpi-label">Today&apos;s Purchase</span>
          <strong className="kpi-value">{dailySummary.purchases.count} Bills</strong>
          <span className="kpi-sub">
            Majuri Rs. {formatDashboardNumber(dailySummary.purchases.amountTotal)}
          </span>
        </div>

        <div className="kpi-card kpi-cash">
          <span className="kpi-label">Cash In Hand</span>
          <strong className="kpi-value">Rs. {formatDashboardNumber(dailySummary.cash.closingBalance)}</strong>
          <span className="kpi-sub">Today&apos;s net Rs. {formatDashboardNumber(dailySummary.cash.netMovement)}</span>
        </div>

        <div className="kpi-card kpi-receivable">
          <span className="kpi-label">Receivable</span>
          <strong className="kpi-value">{outstanding?.receivable.length ?? 0} A/c</strong>
          <span className="kpi-sub">Accounts owing the firm</span>
        </div>

        <div className="kpi-card kpi-payable">
          <span className="kpi-label">Payable</span>
          <strong className="kpi-value">{outstanding?.payable.length ?? 0} A/c</strong>
          <span className="kpi-sub">Accounts the firm owes</span>
        </div>

        <div className="kpi-card kpi-reminder">
          <span className="kpi-label">Reminders</span>
          <strong className="kpi-value">{overdueReminders.length} Overdue</strong>
          <span className="kpi-sub">{upcomingReminders.length} upcoming</span>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <section className="dashboard-quick-actions" aria-label="Quick actions">
          <div className="dashboard-section-title">
            <span>Quick Actions</span>
          </div>

          <div className="quick-row">
            <button className="search-btn" type="button">
              Search
            </button>
            <input
              className="search-input"
              aria-label="Search quick actions"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search a module..."
            />
          </div>

          <div className="dashboard-tile-grid">
            {filteredQuickActions.map((item) => (
              <button
                key={item.id}
                className={`tile ${item.tileClass}`}
                type="button"
                onClick={() => openQuickScreen(item.id, item.label, item.module)}
              >
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
              </button>
            ))}

            {filteredQuickActions.length === 0 && (
              <div className="dashboard-tile-empty">No matching module.</div>
            )}
          </div>
        </section>

        <aside className="dashboard-side-panel">
          <section className="dashboard-brand-card" aria-label="Jewellery ERP branding">
            <div className="logo-icon">&#128142;</div>
            <h1>JEWELLERY</h1>
            <p>ERP Desktop Software</p>
          </section>

          <section className="dashboard-reminders-card" aria-label="Upcoming reminders">
            <div className="dashboard-section-title">
              <span>Upcoming Reminders</span>
              <button
                type="button"
                className="dashboard-view-all-btn"
                onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
              >
                View All
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="dashboard-empty-text">No reminders scheduled.</p>
            ) : (
              <ul className="dashboard-reminder-list">
                {[...overdueReminders, ...upcomingReminders].slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className={item.isOverdue ? 'dashboard-reminder-row overdue' : 'dashboard-reminder-row'}
                  >
                    <span className="dashboard-reminder-name">{item.accountName || 'Unknown'}</span>
                    <span className="dashboard-reminder-meta">
                      {item.type} #{item.billNo} &middot; {item.reminderDate}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
