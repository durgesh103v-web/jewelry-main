import React, { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import type {
  RepairJobRecord,
  RepairDashboardSummary,
  RepairTimelineEventRecord,
  RepairType,
  RepairOwnershipType
} from '@shared/types/repair'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type RepairTab = 'REPAIR_JOBS' | 'DASHBOARD'

interface RepairHubScreenProps {
  onClose?: () => void
  initialTab?: RepairTab
}

export const RepairHubScreen: React.FC<RepairHubScreenProps> = ({
  onClose,
  initialTab = 'REPAIR_JOBS'
}) => {
  const [activeTab, setActiveTab] = useState<RepairTab>(initialTab)
  const [repairs, setRepairs] = useState<RepairJobRecord[]>([])
  const [dashboard, setDashboard] = useState<RepairDashboardSummary | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [karigars, setKarigars] = useState<any[]>([])
  const [stockItems, setStockItems] = useState<any[]>([])

  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [ownershipFilter, setOwnershipFilter] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modals
  const [showIntakeModal, setShowIntakeModal] = useState<boolean>(false)
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false)
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false)
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false)
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false)

  const [selectedJob, setSelectedJob] = useState<RepairJobRecord | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<RepairTimelineEventRecord[]>([])

  // Intake Form
  const [intakeForm, setIntakeForm] = useState({
    customerId: '',
    ownershipType: 'CUSTOMER_OWNED' as RepairOwnershipType,
    stockItemId: '',
    customerItemDescription: '',
    metalType: 'GOLD',
    purityName: '22K',
    repairType: 'Resizing' as RepairType,
    priority: 'NORMAL' as 'NORMAL' | 'URGENT' | 'HIGH',
    receivedDate: dayjs().format('YYYY-MM-DD'),
    expectedDeliveryDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
    beforeGrossWeight: 0,
    beforeNetWeight: 0,
    beforeStoneCount: 0,
    beforeDiamondCount: 0,
    intakeCondition: 'Good condition',
    estimateLabour: 350,
    estimateMaterial: 0,
    estimateStone: 0,
    estimateOther: 0,
    notes: ''
  })

  // Assign Form
  const [assignForm, setAssignForm] = useState({
    repairJobId: '',
    karigarId: '',
    expectedReturnDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    notes: ''
  })

  // Material Issue Form
  const [issueForm, setIssueForm] = useState({
    repairJobId: '',
    karigarId: '',
    metalType: 'GOLD',
    purityName: '22K',
    tunch: 91.6,
    grossWeight: 0,
    netWeight: 0,
    notes: ''
  })

  // Karigar Receive Form
  const [receiveForm, setReceiveForm] = useState({
    repairJobId: '',
    afterGrossWeight: 0,
    afterNetWeight: 0,
    afterStoneCount: 0,
    afterDiamondCount: 0,
    materialReturnedFine: 0,
    materialConsumedFine: 0,
    karigarLabourAmount: 250,
    qcNotes: 'Craftsmanship verified'
  })

  // Delivery Form
  const [deliveryForm, setDeliveryForm] = useState({
    repairJobId: '',
    finalRepairCharge: 350,
    advanceAdjusted: 0,
    amountPaid: 350,
    paymentMethod: 'CASH',
    paymentReference: '',
    deliveredBy: 'Staff Durgesh',
    receivedBy: 'Customer',
    notes: ''
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [jobList, dash, custList, karigarList, stockList] = await Promise.all([
        window.api.repair.listJobs({
          status: statusFilter,
          ownershipType: ownershipFilter,
          search
        }),
        window.api.repair.getDashboard(),
        window.api.customers.list(),
        window.api.manufacturing.listKarigars(),
        window.api.itemIdentification.listStockItems({ status: 'IN_STOCK' })
      ])
      setRepairs(jobList || [])
      setDashboard(dash)
      setCustomers(custList || [])
      setKarigars(karigarList || [])
      setStockItems(stockList || [])
    } catch (err: any) {
      console.error('Error fetching repair data:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, ownershipFilter, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Intake
  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intakeForm.customerId) {
      setError('Please select a customer for repair intake.')
      return
    }
    if (intakeForm.beforeGrossWeight <= 0) {
      setError('Intake gross weight must be greater than zero.')
      return
    }
    try {
      await window.api.repair.createJob(intakeForm)
      setShowIntakeModal(false)
      setSuccessMsg('Repair intake registered successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Handle Assign Karigar
  const handleAssignKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignForm.karigarId) {
      setError('Please select an artisan / karigar.')
      return
    }
    try {
      await window.api.repair.assignKarigar(assignForm)
      setShowAssignModal(false)
      setSuccessMsg('Repair job assigned to artisan successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Handle Issue Material
  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.repair.issueMaterial(issueForm)
      setShowIssueModal(false)
      setSuccessMsg('Repair solder / gold issued to artisan successfully!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Handle Receive from Karigar
  const handleReceiveFromKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (receiveForm.afterGrossWeight <= 0) {
      setError('Post-repair gross weight must be greater than zero.')
      return
    }
    try {
      await window.api.repair.receiveFromKarigar(receiveForm)
      setShowReceiveModal(false)
      setSuccessMsg('Received from workshop! Quality inspected and ready for delivery.')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Handle Delivery
  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.repair.deliver(deliveryForm)
      setShowDeliveryModal(false)
      setSuccessMsg('Repair order completed and delivered to customer!')
      loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // View Timeline
  const handleViewTimeline = async (job: RepairJobRecord) => {
    setSelectedJob(job)
    try {
      const events = await window.api.repair.getTimeline(job.id)
      setTimelineEvents(events || [])
      setShowTimelineModal(true)
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // KPI Calculations
  const activeInService = repairs.filter(
    (r) =>
      r.status === 'RECEIVED' ||
      r.status === 'ASSIGNED' ||
      r.status === 'IN_REPAIR' ||
      r.status === 'RECEIVED_FROM_KARIGAR'
  ).length
  const readyForDelivery = repairs.filter((r) => r.status === 'READY_FOR_DELIVERY').length
  const deliveredCount = repairs.filter((r) => r.status === 'DELIVERED').length
  const totalOutstanding = repairs.reduce((acc, r) => {
    if (r.status === 'DELIVERED') {
      return acc + (r.balanceDue || 0)
    }
    return acc + (r.balanceDue > 0 ? r.balanceDue : r.finalRepairCharge || r.estimateTotal || 0)
  }, 0)

  const selectedIntakeCustomer = customers.find((c) => c.id === intakeForm.customerId)

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* ── Top Header Bar ── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔧</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Repair, Alteration &amp; Customer Service Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
              Workshop &amp; Custody
            </span>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('REPAIR_JOBS')}
              className={`px-3.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'REPAIR_JOBS'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Repair Orders
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
              Service Dashboard
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="h-8 px-3.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reload Repair Data"
          >
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIntakeForm({
                customerId: customers[0]?.id || '',
                ownershipType: 'CUSTOMER_OWNED',
                stockItemId: '',
                customerItemDescription: '',
                metalType: 'GOLD',
                purityName: '22K',
                repairType: 'Resizing',
                priority: 'NORMAL',
                receivedDate: dayjs().format('YYYY-MM-DD'),
                expectedDeliveryDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
                beforeGrossWeight: 0,
                beforeNetWeight: 0,
                beforeStoneCount: 0,
                beforeDiamondCount: 0,
                intakeCondition: 'Good condition',
                estimateLabour: 350,
                estimateMaterial: 0,
                estimateStone: 0,
                estimateOther: 0,
                notes: ''
              })
              setShowIntakeModal(true)
            }}
            className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <span>+</span>
            <span>New Repair Intake</span>
          </button>

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

        {/* ── 1. REPAIR ORDERS TAB ── */}
        {activeTab === 'REPAIR_JOBS' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Standard 4-KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active In-Service
                </span>
                <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {activeInService}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">Workshop running jobs</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Ready for Delivery
                </span>
                <p className="text-2xl font-black text-blue-700 font-mono mt-1">
                  {readyForDelivery}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">QC passed &amp; customer ready</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Delivered &amp; Settled
                </span>
                <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                  {deliveredCount}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">Completed repair orders</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Estimated &amp; Active Dues
                </span>
                <p className="text-2xl font-black text-amber-700 font-mono mt-1">
                  {formatCurrency(totalOutstanding)}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5">Cumulative service charges</span>
              </div>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 shrink-0">
              {[
                { key: 'ALL', label: 'All Orders' },
                { key: 'RECEIVED', label: 'Received (New)' },
                { key: 'IN_REPAIR', label: 'Assigned / In Repair' },
                { key: 'READY_FOR_DELIVERY', label: 'Ready for Delivery' },
                { key: 'DELIVERED', label: 'Delivered' }
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
                    placeholder="Search repair no, customer, item description..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <select
                  value={ownershipFilter}
                  onChange={(e) => setOwnershipFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                >
                  <option value="ALL">All Ownership</option>
                  <option value="CUSTOMER_OWNED">Customer Owned (Custody)</option>
                  <option value="SHOP_OWNED">Shop Stock Item</option>
                </select>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-900">{repairs.length}</strong> repair order(s)
              </div>
            </div>

            {/* Repair Data Table */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">Repair #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-2 text-center">Ownership</th>
                    <th className="py-2.5 px-3">Service / Description</th>
                    <th className="py-2.5 px-2 text-right">Intake Wt</th>
                    <th className="py-2.5 px-2 text-right">Post Wt</th>
                    <th className="py-2.5 px-2 text-right">Estimated / Due (₹)</th>
                    <th className="py-2.5 px-3">Artisan (Karigar)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {repairs.map((r) => {
                    const isCustody = r.ownershipType === 'CUSTOMER_OWNED' || !r.ownershipType
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-slate-900 block">{r.repairNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{formatDate(r.receivedDate)}</span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{r.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.customerMobile || '-'}</div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isCustody
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            {isCustody ? 'Custody' : 'Shop Stock'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-900">{r.repairType}</span>
                            {r.priority === 'URGENT' && (
                              <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[9px] px-1.5 py-0.2 rounded font-extrabold">
                                URGENT
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate max-w-xs mt-0.5">
                            {r.customerItemDescription || r.stockItemCode || 'Jewellery Piece'}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium text-slate-800">
                          {formatWeight(r.beforeGrossWeight)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {r.afterGrossWeight > 0 ? (
                            <span
                              className={
                                r.weightDifference !== 0
                                  ? 'font-bold text-amber-800'
                                  : 'text-slate-900 font-bold'
                              }
                            >
                              {formatWeight(r.afterGrossWeight)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold">
                          <div className="text-slate-900">{formatCurrency(r.finalRepairCharge || r.estimateTotal)}</div>
                          {r.balanceDue > 0 ? (
                            <div className="text-[10px] text-rose-700">Due: {formatCurrency(r.balanceDue)}</div>
                          ) : r.status === 'DELIVERED' ? (
                            <div className="text-[10px] text-emerald-700">Settled</div>
                          ) : null}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">
                          {r.karigarName ? (
                            <span className="text-slate-900 font-semibold">{r.karigarName}</span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              r.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : r.status === 'READY_FOR_DELIVERY'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : r.status === 'IN_REPAIR' || r.status === 'ASSIGNED' || r.status === 'RECEIVED_FROM_KARIGAR'
                                ? 'bg-amber-100 text-amber-900 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {r.status === 'RECEIVED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJob(r)
                                  setAssignForm({
                                    repairJobId: r.id,
                                    karigarId: karigars[0]?.id || '',
                                    expectedReturnDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
                                    notes: ''
                                  })
                                  setShowAssignModal(true)
                                }}
                                className="h-7 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white rounded-md text-[11px] font-bold shadow-2xs cursor-pointer transition-all"
                                style={{ color: '#ffffff' }}
                                title="Assign to Karigar"
                              >
                                Assign
                              </button>
                            )}

                            {(r.status === 'ASSIGNED' || r.status === 'IN_REPAIR') && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedJob(r)
                                    setIssueForm({
                                      repairJobId: r.id,
                                      karigarId: r.assignedKarigarId || '',
                                      metalType: r.metalType,
                                      purityName: r.purityName,
                                      tunch: 91.6,
                                      grossWeight: 0,
                                      netWeight: 0,
                                      notes: ''
                                    })
                                    setShowIssueModal(true)
                                  }}
                                  className="h-7 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[11px] font-semibold shadow-2xs cursor-pointer transition-colors"
                                  title="Issue Solder / Gold"
                                >
                                  Issue
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedJob(r)
                                    setReceiveForm({
                                      repairJobId: r.id,
                                      afterGrossWeight: r.beforeGrossWeight,
                                      afterNetWeight: r.beforeNetWeight,
                                      afterStoneCount: r.beforeStoneCount,
                                      afterDiamondCount: r.beforeDiamondCount,
                                      materialReturnedFine: 0,
                                      materialConsumedFine: 0,
                                      karigarLabourAmount: 250,
                                      qcNotes: 'Craftsmanship verified'
                                    })
                                    setShowReceiveModal(true)
                                  }}
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 !text-white rounded-md text-[11px] font-bold shadow-2xs cursor-pointer transition-all"
                                  style={{ color: '#ffffff' }}
                                  title="Receive Serviced Piece"
                                >
                                  Receive
                                </button>
                              </>
                            )}

                            {(r.status === 'READY_FOR_DELIVERY' || r.status === 'RECEIVED_FROM_KARIGAR') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJob(r)
                                  setDeliveryForm({
                                    repairJobId: r.id,
                                    finalRepairCharge: r.finalRepairCharge || r.estimateTotal || 350,
                                    advanceAdjusted: r.advanceAdjusted || 0,
                                    amountPaid: r.balanceDue > 0 ? r.balanceDue : r.finalRepairCharge || 350,
                                    paymentMethod: 'CASH',
                                    paymentReference: '',
                                    deliveredBy: 'Staff Durgesh',
                                    receivedBy: r.customerName || 'Customer',
                                    notes: ''
                                  })
                                  setShowDeliveryModal(true)
                                }}
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 !text-white rounded-md text-[11px] font-bold shadow-2xs cursor-pointer transition-all"
                                style={{ color: '#ffffff' }}
                                title="Deliver to Customer"
                              >
                                Deliver
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleViewTimeline(r)}
                              className="h-7 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[11px] shadow-2xs cursor-pointer transition-colors"
                              title="Custody Audit Timeline"
                            >
                              📜
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {repairs.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <p className="text-sm font-bold text-slate-800">No repair jobs found</p>
                          <p className="text-xs text-slate-500">
                            Register customer jewellery repair or alteration intake to get started.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowIntakeModal(true)}
                            className="mt-2 h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                            style={{ color: '#ffffff' }}
                          >
                            + New Repair Intake
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

        {/* ── 2. SERVICE DASHBOARD TAB ── */}
        {activeTab === 'DASHBOARD' && dashboard && (
          <div className="flex-1 flex flex-col gap-4 overflow-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs max-w-6xl mx-auto w-full">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Received Today</div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">{dashboard.receivedToday}</div>
                <span className="text-[10px] text-slate-400 mt-0.5">Fresh intakes registered</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-amber-700 font-bold uppercase text-[10px]">Currently In Repair</div>
                <div className="text-2xl font-black font-mono text-amber-800 mt-1">
                  {dashboard.inRepair}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Workshop processing</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-blue-700 font-bold uppercase text-[10px]">Ready for Delivery</div>
                <div className="text-2xl font-black font-mono text-blue-700 mt-1">
                  {dashboard.readyForDelivery}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Awaiting customer collection</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-emerald-700 font-bold uppercase text-[10px]">Delivered Today</div>
                <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                  {dashboard.deliveredToday}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Handed over &amp; settled</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 max-w-6xl mx-auto w-full space-y-4 text-xs shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Workshop &amp; Service Financial Overview
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Aggregate customer billing and workshop artisan liability
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-bold text-[11px] uppercase">Total Active Repair Dues</div>
                  <div className="text-2xl font-black font-mono text-amber-800 mt-1">
                    {formatCurrency(totalOutstanding)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Pending customer settlement</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-bold text-[11px] uppercase">Custody In-Hand Gross Wt</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                    {formatWeight(
                      repairs
                        .filter((r) => r.status !== 'DELIVERED')
                        .reduce((acc, r) => acc + (r.beforeGrossWeight || 0), 0)
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Under workshop custody</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-bold text-[11px] uppercase">Registered Artisans</div>
                  <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                    {karigars.length} Active Karigars
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Workshop service partners</div>
                </div>
              </div>

              {/* Service Type Breakdown */}
              <div className="pt-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Service Category Breakdown
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Service Type</th>
                        <th className="py-2.5 px-3 text-center">Total Orders</th>
                        <th className="py-2.5 px-3 text-center">In Progress</th>
                        <th className="py-2.5 px-3 text-center">Ready / Delivered</th>
                        <th className="py-2.5 px-3 text-right">Estimated Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {['Resizing', 'Soldering', 'Polishing', 'Stone Replacement', 'Alteration'].map((st) => {
                        const count = repairs.filter((r) => r.repairType === st).length
                        const inProg = repairs.filter((r) => r.repairType === st && (r.status === 'RECEIVED' || r.status === 'IN_REPAIR' || r.status === 'ASSIGNED')).length
                        const done = repairs.filter((r) => r.repairType === st && (r.status === 'READY_FOR_DELIVERY' || r.status === 'DELIVERED')).length
                        const rev = repairs.filter((r) => r.repairType === st).reduce((acc, r) => acc + (r.finalRepairCharge || r.estimateTotal || 0), 0)
                        return (
                          <tr key={st} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{st}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">{count}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-mono bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-bold">
                                {inProg}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                                {done}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(rev)}
                            </td>
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

      {/* ── INTAKE MODAL ── */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden font-sans max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>💎</span>
                  <span>New Jewellery Repair &amp; Service Intake</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Record custody receipt, exact intake weight, and estimated service charges
                </p>
              </div>
              <button
                onClick={() => setShowIntakeModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIntake} className="p-6 space-y-4 text-xs overflow-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={intakeForm.customerId}
                    onChange={(e) => setIntakeForm({ ...intakeForm, customerId: e.target.value })}
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
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ownership Type:</label>
                  <select
                    value={intakeForm.ownershipType}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        ownershipType: e.target.value as RepairOwnershipType
                      })
                    }
                    className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-bold"
                  >
                    <option value="CUSTOMER_OWNED">Customer Owned (Custody Item)</option>
                    <option value="SHOP_OWNED">Shop Stock Piece</option>
                  </select>
                </div>
              </div>

              {selectedIntakeCustomer && (
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
                  <span>
                    Customer: <strong className="text-slate-900">{selectedIntakeCustomer.name}</strong>
                  </span>
                  <span className="font-mono text-slate-700 font-semibold">
                    Contact: {selectedIntakeCustomer.mobile || 'No Mobile'}
                  </span>
                </div>
              )}

              {intakeForm.ownershipType === 'SHOP_OWNED' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Physical Stock Item:</label>
                  <select
                    value={intakeForm.stockItemId}
                    onChange={(e) => setIntakeForm({ ...intakeForm, stockItemId: e.target.value })}
                    className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono"
                  >
                    <option value="">-- Select Stock Item --</option>
                    {stockItems.map((si) => (
                      <option key={si.id} value={si.id}>
                        {si.itemName} ({si.stockItemCode} - {formatWeight(si.grossWeight)})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Customer Item Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={intakeForm.customerItemDescription}
                    onChange={(e) => setIntakeForm({ ...intakeForm, customerItemDescription: e.target.value })}
                    placeholder="e.g. 22K Gold Antique Choker Necklace with broken hook"
                    required
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Service / Repair Type:</label>
                  <select
                    value={intakeForm.repairType}
                    onChange={(e) => setIntakeForm({ ...intakeForm, repairType: e.target.value as RepairType })}
                    className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-bold text-amber-900"
                  >
                    <option value="Resizing">Resizing (Ring / Bangle)</option>
                    <option value="Soldering">Soldering / Laser Welding</option>
                    <option value="Polishing">High-Gloss Buffing &amp; Polish</option>
                    <option value="Cleaning">Ultrasonic Deep Cleaning</option>
                    <option value="Stone Replacement">Stone / Diamond Replacement</option>
                    <option value="Rhodium">Rhodium / Gold Electroplating</option>
                    <option value="Alteration">Bespoke Alteration / Re-stringing</option>
                    <option value="Other">Other Custom Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Priority:</label>
                  <select
                    value={intakeForm.priority}
                    onChange={(e) => setIntakeForm({ ...intakeForm, priority: e.target.value as any })}
                    className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-semibold"
                  >
                    <option value="NORMAL">Normal Delivery</option>
                    <option value="URGENT">Urgent (Express Service)</option>
                    <option value="HIGH">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Metal Type &amp; Purity:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={intakeForm.metalType}
                      onChange={(e) => setIntakeForm({ ...intakeForm, metalType: e.target.value })}
                      className="h-9 px-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-semibold"
                    >
                      <option value="GOLD">Gold</option>
                      <option value="SILVER">Silver</option>
                      <option value="PLATINUM">Platinum</option>
                    </select>
                    <select
                      value={intakeForm.purityName}
                      onChange={(e) => setIntakeForm({ ...intakeForm, purityName: e.target.value })}
                      className="h-9 px-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-semibold"
                    >
                      <option value="22K">22K (916)</option>
                      <option value="18K">18K (750)</option>
                      <option value="14K">14K (585)</option>
                      <option value="24K">24K (999)</option>
                      <option value="925">925 Silver</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Expected Delivery Date:</label>
                  <input
                    type="date"
                    value={intakeForm.expectedDeliveryDate}
                    onChange={(e) => setIntakeForm({ ...intakeForm, expectedDeliveryDate: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Exact Intake Measurements */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <span className="font-bold text-amber-900 text-xs block uppercase tracking-wider">
                  Precise Intake Measurements (Custody Proof)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Intake Gross Wt (g) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={intakeForm.beforeGrossWeight || ''}
                      onChange={(e) =>
                        setIntakeForm({
                          ...intakeForm,
                          beforeGrossWeight: parseFloat(e.target.value) || 0,
                          beforeNetWeight: parseFloat(e.target.value) || 0
                        })
                      }
                      placeholder="0.000"
                      required
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono font-black text-amber-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Stone Count:</label>
                    <input
                      type="number"
                      value={intakeForm.beforeStoneCount}
                      onChange={(e) =>
                        setIntakeForm({ ...intakeForm, beforeStoneCount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Est. Charge (₹):</label>
                    <input
                      type="number"
                      value={intakeForm.estimateLabour}
                      onChange={(e) =>
                        setIntakeForm({ ...intakeForm, estimateLabour: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono font-extrabold text-slate-900 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Intake Condition &amp; Remarks:</label>
                <textarea
                  rows={2}
                  value={intakeForm.intakeCondition}
                  onChange={(e) => setIntakeForm({ ...intakeForm, intakeCondition: e.target.value })}
                  placeholder="Note scratches, missing stones, specific customer instructions..."
                  className="w-full p-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
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
                  <span>Register Intake</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL ── */}
      {showAssignModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🔨</span>
                  <span>Assign Repair to Artisan</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {selectedJob.repairNumber} • {selectedJob.customerItemDescription}
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignKarigar} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                <div>
                  Service: <strong className="text-amber-900">{selectedJob.repairType}</strong>
                </div>
                <div>
                  Intake Weight: <strong className="font-mono">{formatWeight(selectedJob.beforeGrossWeight)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Karigar / Artisan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignForm.karigarId}
                  onChange={(e) => setAssignForm({ ...assignForm, karigarId: e.target.value })}
                  required
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                >
                  <option value="">-- Select Karigar --</option>
                  {karigars.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.specialization || 'Artisan'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Return Date:</label>
                <input
                  type="date"
                  value={assignForm.expectedReturnDate}
                  onChange={(e) => setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
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
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ISSUE MATERIAL MODAL ── */}
      {showIssueModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Issue Repair Metal / Solder</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Track workshop material issue for {selectedJob.repairNumber}
                </p>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueMaterial} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Gross Wt (g) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={issueForm.grossWeight || ''}
                    onChange={(e) =>
                      setIssueForm({
                        ...issueForm,
                        grossWeight: parseFloat(e.target.value) || 0,
                        netWeight: parseFloat(e.target.value) || 0
                      })
                    }
                    placeholder="0.000"
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tunch / Purity %:</label>
                  <input
                    type="number"
                    value={issueForm.tunch}
                    onChange={(e) => setIssueForm({ ...issueForm, tunch: parseFloat(e.target.value) || 91.6 })}
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
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
                  <span>Confirm Issue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECEIVE FROM KARIGAR MODAL ── */}
      {showReceiveModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📥</span>
                  <span>Receive Serviced Jewellery from Workshop</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Inspect craftsmanship and record post-repair weight verification
                </p>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReceiveFromKarigar} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  Intake Gross Wt: <strong className="font-mono">{formatWeight(selectedJob.beforeGrossWeight)}</strong>
                </div>
                <div>
                  Artisan: <strong className="text-slate-900">{selectedJob.karigarName || 'Artisan'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Post-Repair Gross Wt (g) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={receiveForm.afterGrossWeight || ''}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        afterGrossWeight: parseFloat(e.target.value) || 0,
                        afterNetWeight: parseFloat(e.target.value) || 0
                      })
                    }
                    placeholder="0.000"
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold text-sm"
                    required
                  />
                  {receiveForm.afterGrossWeight > 0 && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      Weight Difference:{' '}
                      <strong className="font-mono text-amber-800">
                        {formatWeight(receiveForm.afterGrossWeight - selectedJob.beforeGrossWeight)}
                      </strong>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Karigar Labour Charge (₹):</label>
                  <input
                    type="number"
                    value={receiveForm.karigarLabourAmount}
                    onChange={(e) =>
                      setReceiveForm({ ...receiveForm, karigarLabourAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">QC &amp; Craftsmanship Notes:</label>
                <input
                  type="text"
                  value={receiveForm.qcNotes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, qcNotes: e.target.value })}
                  placeholder="e.g. Polish high gloss verified, solder clean"
                  className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
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
                  <span>Accept &amp; Mark Ready for Delivery</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELIVERY MODAL ── */}
      {showDeliveryModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden font-sans">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🤝</span>
                  <span>Deliver Serviced Jewellery to Customer</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {selectedJob.repairNumber} • {selectedJob.customerName}
                </p>
              </div>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeliver} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Intake Weight:</span>
                  <strong className="font-mono">{formatWeight(selectedJob.beforeGrossWeight)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Delivered Gross Weight:</span>
                  <strong className="font-mono text-emerald-800 font-bold">
                    {formatWeight(selectedJob.afterGrossWeight || selectedJob.beforeGrossWeight)}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Final Service Charge (₹):</label>
                  <input
                    type="number"
                    value={deliveryForm.finalRepairCharge}
                    onChange={(e) =>
                      setDeliveryForm({
                        ...deliveryForm,
                        finalRepairCharge: parseFloat(e.target.value) || 0,
                        amountPaid: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Amount Collected (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={deliveryForm.amountPaid}
                    onChange={(e) =>
                      setDeliveryForm({ ...deliveryForm, amountPaid: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-emerald-700 font-mono font-black text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Method:</label>
                <select
                  value={deliveryForm.paymentMethod}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, paymentMethod: e.target.value })}
                  className="w-full h-9 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
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
                  <span>Complete Delivery &amp; Close</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TIMELINE MODAL ── */}
      {showTimelineModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs max-h-[80vh] flex flex-col font-sans overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📜</span>
                  <span>Custody Timeline: {selectedJob.repairNumber}</span>
                </h2>
                <div className="text-slate-500 text-[11px] mt-0.5">{selectedJob.customerName}</div>
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
                <div className="text-center text-slate-400 py-6">No custody timeline records found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RepairHubScreen
