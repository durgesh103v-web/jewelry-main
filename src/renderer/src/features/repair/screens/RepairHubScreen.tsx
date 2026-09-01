import React, { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import type {
  RepairJobRecord,
  RepairDashboardSummary,
  RepairTimelineEventRecord,
  RepairType,
  RepairOwnershipType
} from '@shared/types/repair'

type RepairTab = 'DASHBOARD' | 'REPAIR_JOBS'

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
    intakeCondition: 'Good',
    estimateLabour: 300,
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
    deliveredBy: 'Staff',
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
      setRepairs(jobList)
      setDashboard(dash)
      setCustomers(custList || [])
      setKarigars(karigarList || [])
      setStockItems(stockList || [])
    } catch (err: any) {
      console.error('Error fetching repair data:', err)
      setError(err.message || 'Failed to load repair data')
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
    try {
      await window.api.repair.createJob(intakeForm)
      setShowIntakeModal(false)
      setSuccessMsg('Repair intake registered successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Intake failed')
    }
  }

  // Handle Assign Karigar
  const handleAssignKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.repair.assignKarigar(assignForm)
      setShowAssignModal(false)
      setSuccessMsg('Repair assigned to Karigar!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Assignment failed')
    }
  }

  // Handle Issue Material
  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.repair.issueMaterial(issueForm)
      setShowIssueModal(false)
      setSuccessMsg('Repair material issued to Karigar!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Material issue failed')
    }
  }

  // Handle Receive from Karigar
  const handleReceiveFromKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.repair.receiveFromKarigar(receiveForm)
      setShowReceiveModal(false)
      setSuccessMsg('Received from Karigar! Status updated to QC Approved.')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Receive failed')
    }
  }

  // Handle Delivery
  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.repair.deliver(deliveryForm)
      setShowDeliveryModal(false)
      setSuccessMsg('Repair completed and delivered to customer!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Delivery failed')
    }
  }

  // View Timeline
  const handleViewTimeline = async (job: RepairJobRecord) => {
    setSelectedJob(job)
    try {
      const events = await window.api.repair.getTimeline(job.id)
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
          <span className="text-xl">🔧</span>
          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight">
              Repair, Alteration & Customer Service Hub
            </h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('REPAIR_JOBS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'REPAIR_JOBS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Repair Orders
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
            Service Dashboard
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

      {/* Main Container */}
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

        {/* 1. Repair Orders Tab */}
        {activeTab === 'REPAIR_JOBS' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Filter Toolbar */}
            <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search repair no, customer, item..."
                  className="w-56 h-8 px-3 text-xs bg-background border border-input rounded-lg"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-3 text-xs bg-background border border-input rounded-lg"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RECEIVED">Received</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_REPAIR">In Repair</option>
                  <option value="RECEIVED_FROM_KARIGAR">Received from Karigar</option>
                  <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                </select>

                <select
                  value={ownershipFilter}
                  onChange={(e) => setOwnershipFilter(e.target.value)}
                  className="h-8 px-3 text-xs bg-background border border-input rounded-lg"
                >
                  <option value="ALL">All Ownership</option>
                  <option value="CUSTOMER_OWNED">Customer Owned (Custody)</option>
                  <option value="SHOP_OWNED">Shop Stock</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(true)}
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-xs flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>New Repair Intake</span>
                </button>
              </div>
            </div>

            {/* Repair Table */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Repair No</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-2 text-center">Ownership</th>
                    <th className="py-2.5 px-3">Service / Item</th>
                    <th className="py-2.5 px-2 text-right">Intake Wt (g)</th>
                    <th className="py-2.5 px-2 text-right">Post Wt (g)</th>
                    <th className="py-2.5 px-3">Karigar</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {repairs.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">{r.repairNumber}</td>
                      <td className="py-2 px-3 font-semibold">{r.customerName}</td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            r.ownershipType === 'CUSTOMER_OWNED'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                          }`}
                        >
                          {r.ownershipType === 'CUSTOMER_OWNED' ? 'Custody' : 'Shop Stock'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-primary">{r.repairType}</span>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {r.customerItemDescription || r.stockItemCode || 'Jewellery Piece'}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium">{r.beforeGrossWeight.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {r.afterGrossWeight > 0 ? (
                          <span
                            className={
                              r.weightDifference !== 0
                                ? 'font-bold text-amber-600 dark:text-amber-400'
                                : 'text-foreground'
                            }
                          >
                            {r.afterGrossWeight.toFixed(3)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{r.karigarName || 'Unassigned'}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            r.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : r.status === 'READY_FOR_DELIVERY'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : r.status === 'IN_REPAIR' || r.status === 'ASSIGNED'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center space-x-1">
                        {r.status === 'RECEIVED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignForm((prev) => ({ ...prev, repairJobId: r.id }))
                              setShowAssignModal(true)
                            }}
                            className="px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-[11px] font-semibold"
                          >
                            Assign
                          </button>
                        )}
                        {(r.status === 'ASSIGNED' || r.status === 'IN_REPAIR') && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIssueForm((prev) => ({
                                  ...prev,
                                  repairJobId: r.id,
                                  karigarId: r.assignedKarigarId || '',
                                  metalType: r.metalType,
                                  purityName: r.purityName
                                }))
                                setShowIssueModal(true)
                              }}
                              className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-[11px] font-semibold"
                            >
                              Issue Metal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReceiveForm((prev) => ({
                                  ...prev,
                                  repairJobId: r.id,
                                  afterGrossWeight: r.beforeGrossWeight,
                                  afterNetWeight: r.beforeNetWeight,
                                  afterStoneCount: r.beforeStoneCount,
                                  afterDiamondCount: r.beforeDiamondCount
                                }))
                                setShowReceiveModal(true)
                              }}
                              className="px-2 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded text-[11px] font-semibold"
                            >
                              Receive
                            </button>
                          </>
                        )}
                        {(r.status === 'READY_FOR_DELIVERY' || r.status === 'RECEIVED_FROM_KARIGAR') && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryForm((prev) => ({
                                ...prev,
                                repairJobId: r.id,
                                finalRepairCharge: r.estimateTotal || 350,
                                amountPaid: r.estimateTotal || 350
                              }))
                              setShowDeliveryModal(true)
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                          >
                            Deliver
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleViewTimeline(r)}
                          className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-[11px]"
                        >
                          📜
                        </button>
                      </td>
                    </tr>
                  ))}
                  {repairs.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        No repair jobs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Service Dashboard Tab */}
        {activeTab === 'DASHBOARD' && dashboard && (
          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            <div className="grid grid-cols-4 gap-4 text-xs max-w-5xl mx-auto w-full">
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Received Today</div>
                <div className="text-2xl font-bold font-mono text-primary mt-1">{dashboard.receivedToday}</div>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Currently In Repair</div>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {dashboard.inRepair}
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Ready for Delivery</div>
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {dashboard.readyForDelivery}
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border">
                <div className="text-muted-foreground font-semibold">Delivered Today</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {dashboard.deliveredToday}
                </div>
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border max-w-5xl mx-auto w-full space-y-3 text-xs">
              <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
                Repair Financial Summary
              </h3>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Total Outstanding Uncollected Repair Charges:</span>
                <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                  ₹{dashboard.totalOutstandingAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INTAKE MODAL */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-auto">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              New Jewellery Repair & Service Intake
            </h2>
            <form onSubmit={handleCreateIntake} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Customer:</label>
                  <select
                    value={intakeForm.customerId}
                    onChange={(e) => setIntakeForm({ ...intakeForm, customerId: e.target.value })}
                    required
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile || 'No Mobile'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Ownership Type:</label>
                  <select
                    value={intakeForm.ownershipType}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        ownershipType: e.target.value as RepairOwnershipType
                      })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-semibold"
                  >
                    <option value="CUSTOMER_OWNED">Customer Owned (Custody - Not Sellable)</option>
                    <option value="SHOP_OWNED">Shop Stock Item</option>
                  </select>
                </div>
              </div>

              {intakeForm.ownershipType === 'SHOP_OWNED' ? (
                <div>
                  <label className="block text-muted-foreground mb-1">Select Physical Stock Item:</label>
                  <select
                    value={intakeForm.stockItemId}
                    onChange={(e) => setIntakeForm({ ...intakeForm, stockItemId: e.target.value })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  >
                    <option value="">Select Stock Item</option>
                    {stockItems.map((si) => (
                      <option key={si.id} value={si.id}>
                        {si.itemName} ({si.stockItemCode} - {si.grossWeight.toFixed(3)}g)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-muted-foreground mb-1">Customer Item Description:</label>
                  <input
                    type="text"
                    value={intakeForm.customerItemDescription}
                    onChange={(e) => setIntakeForm({ ...intakeForm, customerItemDescription: e.target.value })}
                    placeholder="e.g. 22K Gold Ladies Ring with Red Stone"
                    required
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Service / Repair Type:</label>
                  <select
                    value={intakeForm.repairType}
                    onChange={(e) => setIntakeForm({ ...intakeForm, repairType: e.target.value as RepairType })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  >
                    <option value="Resizing">Resizing</option>
                    <option value="Polishing">Polishing</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Stone Replacement">Stone Replacement</option>
                    <option value="Soldering">Soldering</option>
                    <option value="Rhodium">Rhodium / Plating</option>
                    <option value="Alteration">Alteration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Expected Delivery Date:</label>
                  <input
                    type="date"
                    value={intakeForm.expectedDeliveryDate}
                    onChange={(e) => setIntakeForm({ ...intakeForm, expectedDeliveryDate: e.target.value })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  />
                </div>
              </div>

              {/* Exact Intake Measurements */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                <div>
                  <label className="block text-muted-foreground mb-1">Intake Gross Wt (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={intakeForm.beforeGrossWeight}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        beforeGrossWeight: parseFloat(e.target.value) || 0,
                        beforeNetWeight: parseFloat(e.target.value) || 0
                      })
                    }
                    required
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Stone Count:</label>
                  <input
                    type="number"
                    value={intakeForm.beforeStoneCount}
                    onChange={(e) => setIntakeForm({ ...intakeForm, beforeStoneCount: parseInt(e.target.value) || 0 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Estimated Charge (₹):</label>
                  <input
                    type="number"
                    value={intakeForm.estimateLabour}
                    onChange={(e) => setIntakeForm({ ...intakeForm, estimateLabour: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Register Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">Assign Repair to Karigar</h2>
            <form onSubmit={handleAssignKarigar} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Select Karigar:</label>
                <select
                  value={assignForm.karigarId}
                  onChange={(e) => setAssignForm({ ...assignForm, karigarId: e.target.value })}
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                >
                  <option value="">Select Karigar</option>
                  {karigars.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.specialization})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Assign Karigar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE MATERIAL MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Issue Repair Metal / Solder to Karigar
            </h2>
            <form onSubmit={handleIssueMaterial} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Gross Wt (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={issueForm.grossWeight}
                    onChange={(e) =>
                      setIssueForm({
                        ...issueForm,
                        grossWeight: parseFloat(e.target.value) || 0,
                        netWeight: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Tunch / Purity %:</label>
                  <input
                    type="number"
                    value={issueForm.tunch}
                    onChange={(e) => setIssueForm({ ...issueForm, tunch: parseFloat(e.target.value) || 100 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE FROM KARIGAR MODAL */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Receive Serviced Jewellery from Karigar
            </h2>
            <form onSubmit={handleReceiveFromKarigar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Post-Repair Gross Wt (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={receiveForm.afterGrossWeight}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        afterGrossWeight: parseFloat(e.target.value) || 0,
                        afterNetWeight: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold text-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Karigar Labour (₹):</label>
                  <input
                    type="number"
                    value={receiveForm.karigarLabourAmount}
                    onChange={(e) =>
                      setReceiveForm({ ...receiveForm, karigarLabourAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Accept & Mark QC Ready
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELIVERY MODAL */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Deliver Serviced Jewellery to Customer
            </h2>
            <form onSubmit={handleDeliver} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Final Charge (₹):</label>
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
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Amount Paid (₹):</label>
                  <input
                    type="number"
                    value={deliveryForm.amountPaid}
                    onChange={(e) =>
                      setDeliveryForm({ ...deliveryForm, amountPaid: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Payment Method:</label>
                <select
                  value={deliveryForm.paymentMethod}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, paymentMethod: e.target.value })}
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="CARD">Card / POS Machine</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                >
                  Complete Delivery & Close Custody
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMELINE MODAL */}
      {showTimelineModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h2 className="text-sm font-bold text-foreground">
                Custody Timeline: {selectedJob.repairNumber}
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

export default RepairHubScreen
