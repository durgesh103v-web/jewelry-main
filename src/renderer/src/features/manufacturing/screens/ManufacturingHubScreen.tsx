import React, { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import type {
  KarigarRecord,
  ManufacturingOrderRecord,
  ManufacturingReconciliationSummary,
  KarigarMetalLedgerRecord
} from '@shared/types/manufacturing'

type MfgTab = 'ORDERS' | 'MATERIAL_ISSUE' | 'RECEIPTS' | 'RECONCILIATION' | 'KARIGARS'

interface ManufacturingHubScreenProps {
  onClose?: () => void
  initialTab?: MfgTab
}

export const ManufacturingHubScreen: React.FC<ManufacturingHubScreenProps> = ({
  onClose,
  initialTab = 'ORDERS'
}) => {
  const [activeTab, setActiveTab] = useState<MfgTab>(initialTab)
  const [orders, setOrders] = useState<ManufacturingOrderRecord[]>([])
  const [karigars, setKarigars] = useState<KarigarRecord[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Reconciliation summary
  const [reconSummary, setReconSummary] = useState<ManufacturingReconciliationSummary | null>(null)

  // Karigar Metal Ledger state
  const [selectedKarigarLedger, setSelectedKarigarLedger] = useState<KarigarMetalLedgerRecord[]>([])
  const [viewingKarigar, setViewingKarigar] = useState<KarigarRecord | null>(null)

  // Modals & Form states
  const [showCreateOrderModal, setShowCreateOrderModal] = useState<boolean>(false)
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false)
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false)
  const [showKarigarModal, setShowKarigarModal] = useState<boolean>(false)
  const [showSettlementModal, setShowSettlementModal] = useState<boolean>(false)

  // Order Form
  const [orderForm, setOrderForm] = useState({
    itemId: '',
    karigarId: '',
    plannedPcs: 1,
    plannedGrossWeight: 0,
    plannedNetWeight: 0,
    metalType: 'GOLD',
    purityName: '22K',
    expectedDeliveryDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    notes: ''
  })

  // Issue Form
  const [issueForm, setIssueForm] = useState({
    orderId: '',
    karigarId: '',
    metalType: 'GOLD',
    purityName: '22K',
    tunch: 91.6,
    grossWeight: 0,
    netWeight: 0,
    stoneWeight: 0,
    stonePcs: 0,
    diamondCarats: 0,
    diamondPcs: 0,
    issueDate: dayjs().format('YYYY-MM-DD'),
    notes: ''
  })

  // Receipt Form
  const [receiptForm, setReceiptForm] = useState({
    orderId: '',
    karigarId: '',
    itemId: '',
    pcs: 1,
    grossWeight: 0,
    lessWeight: 0,
    netWeight: 0,
    purityName: '22K',
    tunch: 91.6,
    wastagePercent: 0,
    actualWastageWeight: 0,
    processLossWeight: 0,
    scrapWeight: 0,
    labourRate: 500,
    labourRateType: 'Gm' as 'Gm' | 'Pcs' | 'Kg',
    qcStatus: 'APPROVED' as 'APPROVED' | 'REJECTED' | 'REWORK',
    receiptDate: dayjs().format('YYYY-MM-DD'),
    notes: ''
  })

  // Karigar Form
  const [karigarForm, setKarigarForm] = useState({
    name: '',
    mobile: '',
    address: '',
    specialization: 'Handmade'
  })

  // Settlement Form
  const [settlementForm, setSettlementForm] = useState({
    karigarId: '',
    settlementDate: dayjs().format('YYYY-MM-DD'),
    settlementType: 'CASH' as 'CASH' | 'BANK' | 'METAL' | 'ADJUSTMENT',
    amountPaid: 0,
    fineMetalSettled: 0,
    paymentReference: '',
    notes: ''
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [orderList, karigarList, itemList] = await Promise.all([
        window.api.manufacturing.listOrders({ status: statusFilter, search }),
        window.api.manufacturing.listKarigars(),
        window.api.items.list()
      ])
      setOrders(orderList)
      setKarigars(karigarList)
      setItems(itemList || [])

      if (selectedOrderId) {
        const recon = await window.api.manufacturing.getReconciliation(selectedOrderId)
        setReconSummary(recon)
      }
    } catch (err: any) {
      console.error('Error loading manufacturing data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, search, selectedOrderId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelectOrderForRecon = async (orderId: string) => {
    setSelectedOrderId(orderId)
    setActiveTab('RECONCILIATION')
    try {
      const recon = await window.api.manufacturing.getReconciliation(orderId)
      setReconSummary(recon)
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliation')
    }
  }

  // Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.createOrder(orderForm)
      setShowCreateOrderModal(false)
      setSuccessMsg('Manufacturing order created successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    }
  }

  // Issue Material
  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.issueMaterial(issueForm)
      setShowIssueModal(false)
      setSuccessMsg('Material issued to karigar successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to issue material')
    }
  }

  // Receive Finished Goods
  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.receiveFinishedGoods(receiptForm)
      setShowReceiptModal(false)
      setSuccessMsg('Finished goods received and physical stock tagged!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to receive goods')
    }
  }

  // Create Karigar
  const handleCreateKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.createKarigar(karigarForm)
      setShowKarigarModal(false)
      setSuccessMsg('Karigar registered successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to create karigar')
    }
  }

  // Settle Karigar
  const handleSettleKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.settleKarigar(settlementForm)
      setShowSettlementModal(false)
      setSuccessMsg('Settlement recorded successfully!')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement')
    }
  }

  const handleViewMetalLedger = async (k: KarigarRecord) => {
    setViewingKarigar(k)
    try {
      const ledger = await window.api.manufacturing.getKarigarMetalLedger({ karigarId: k.id })
      setSelectedKarigarLedger(ledger)
    } catch (err: any) {
      setError(err.message || 'Failed to load metal ledger')
    }
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-13 px-4 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚒️</span>
          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight">
              Job Work & Jewellery Manufacturing Engine
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('ORDERS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'ORDERS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Production Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MATERIAL_ISSUE')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'MATERIAL_ISSUE'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Material Issue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RECEIPTS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'RECEIPTS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Finished Receipts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'RECONCILIATION'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Metal Reconciliation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('KARIGARS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'KARIGARS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Karigar Ledger & Directory
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

        {/* 1. Production Orders Tab */}
        {activeTab === 'ORDERS' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Toolbar */}
            <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search order number, item, or karigar..."
                  className="w-64 h-8 px-3 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-3 text-xs bg-background border border-input rounded-lg"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOrderModal(true)}
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-xs flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>New Manufacturing Order</span>
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Order No</th>
                    <th className="py-2.5 px-3">Karigar</th>
                    <th className="py-2.5 px-3">Item / Design</th>
                    <th className="py-2.5 px-2 text-center">Pcs</th>
                    <th className="py-2.5 px-2 text-right">Target Wt (g)</th>
                    <th className="py-2.5 px-2 text-right">Issued Fine (g)</th>
                    <th className="py-2.5 px-2 text-right">Finished Fine (g)</th>
                    <th className="py-2.5 px-3 text-center">Delivery Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">{o.orderNumber}</td>
                      <td className="py-2 px-3 font-semibold">{o.karigarName}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-foreground">{o.itemName}</span>
                        {o.designName && <span className="text-muted-foreground text-[11px]"> ({o.designName})</span>}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">{o.plannedPcs}</td>
                      <td className="py-2 px-2 text-right font-mono">{o.plannedNetWeight.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-primary">{o.totalIssuedFine.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {o.totalFinishedFine.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[11px]">{o.expectedDeliveryDate || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            o.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : o.status === 'IN_PROGRESS' || o.status === 'PARTIALLY_RECEIVED'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIssueForm((prev) => ({
                              ...prev,
                              orderId: o.id,
                              karigarId: o.karigarId,
                              metalType: o.metalType,
                              purityName: o.purityName
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
                            setReceiptForm((prev) => ({
                              ...prev,
                              orderId: o.id,
                              karigarId: o.karigarId,
                              itemId: o.itemId,
                              purityName: o.purityName
                            }))
                            setShowReceiptModal(true)
                          }}
                          className="px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-[11px] font-semibold"
                        >
                          Receive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectOrderForRecon(o.id)}
                          className="px-2 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded text-[11px] font-semibold"
                        >
                          Audit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No manufacturing orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Metal Reconciliation Tab */}
        {activeTab === 'RECONCILIATION' && (
          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            {reconSummary ? (
              <div className="max-w-4xl mx-auto w-full space-y-4">
                {/* Header Card */}
                <div className="bg-card p-4 rounded-xl border border-border flex justify-between items-center shadow-sm">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Reconciliation Audit: {reconSummary.order.orderNumber} ({reconSummary.order.itemName})
                    </h2>
                    <div className="text-xs text-muted-foreground">
                      Karigar: <strong className="text-foreground">{reconSummary.order.karigarName}</strong> | Planned:{' '}
                      {reconSummary.order.plannedPcs} pcs ({reconSummary.order.plannedNetWeight.toFixed(3)}g)
                    </div>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${
                      reconSummary.isReconciled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {reconSummary.isReconciled ? '✓ RECONCILED' : '⚠️ UNRECONCILED DIFFERENCE'}
                  </span>
                </div>

                {/* Audit Grid */}
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                    <div className="text-muted-foreground font-semibold text-[11px]">Total Fine Issued</div>
                    <div className="text-xl font-bold font-mono text-primary mt-1">
                      {reconSummary.totalFineIssued.toFixed(3)} g
                    </div>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                    <div className="text-muted-foreground font-semibold text-[11px]">Unused Metal Returned</div>
                    <div className="text-xl font-bold font-mono text-foreground mt-1">
                      {reconSummary.totalFineReturned.toFixed(3)} g
                    </div>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                    <div className="text-muted-foreground font-semibold text-[11px]">Finished Goods Fine</div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {reconSummary.totalFineReceived.toFixed(3)} g
                    </div>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                    <div className="text-muted-foreground font-semibold text-[11px]">Approved Loss & Wastage</div>
                    <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                      {reconSummary.totalApprovedLoss.toFixed(3)} g
                    </div>
                  </div>
                </div>

                {/* Metal Balance Equation Box */}
                <div className="bg-card p-4 rounded-xl border border-border space-y-2 text-xs">
                  <h3 className="font-bold text-xs uppercase text-primary border-b border-border pb-1">
                    Canonical Metal Reconciliation Formula
                  </h3>
                  <div className="font-mono text-xs py-2 bg-muted/30 p-3 rounded-lg flex justify-between items-center">
                    <span>
                      {reconSummary.totalFineIssued.toFixed(3)}g (Issued) - {reconSummary.totalFineReturned.toFixed(3)}g (Returned)
                      - {reconSummary.totalFineReceived.toFixed(3)}g (Finished) - {reconSummary.totalApprovedLoss.toFixed(3)}g (Loss)
                    </span>
                    <strong
                      className={`text-sm ${
                        reconSummary.isReconciled
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      = {reconSummary.unreconciledDifference.toFixed(3)} g difference
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-xs py-12">
                Select an order from the Production Orders tab to inspect reconciliation.
              </div>
            )}
          </div>
        )}

        {/* 3. Karigar Directory & Metal Ledger Tab */}
        {activeTab === 'KARIGARS' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Left: Karigars List */}
            <div className="w-1/2 flex flex-col gap-3 overflow-hidden">
              <div className="bg-card p-3 rounded-xl border border-border flex justify-between items-center text-xs">
                <span className="font-bold text-foreground">Registered Karigars & Artisans</span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSettlementModal(true)}
                    className="h-7 px-3 bg-secondary text-secondary-foreground font-semibold rounded-lg text-xs"
                  >
                    Settle Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKarigarModal(true)}
                    className="h-7 px-3 bg-primary text-primary-foreground font-semibold rounded-lg text-xs"
                  >
                    + Add Karigar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto border border-border rounded-xl bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 z-10 border-b border-border">
                    <tr>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Specialization</th>
                      <th className="py-2 px-3 text-right">Fine Gold Bal</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {karigars.map((k) => (
                      <tr
                        key={k.id}
                        onClick={() => handleViewMetalLedger(k)}
                        className={`hover:bg-muted/30 cursor-pointer ${
                          viewingKarigar?.id === k.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold">{k.karigarCode}</td>
                        <td className="py-2 px-3 font-semibold">{k.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{k.specialization}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                          {k.fineGoldBalance.toFixed(3)} g
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewMetalLedger(k)
                            }}
                            className="px-2 py-0.5 bg-muted rounded text-[10px] font-semibold hover:bg-muted/80"
                          >
                            Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Karigar Metal Ledger */}
            <div className="w-1/2 bg-card p-4 rounded-xl border border-border flex flex-col overflow-hidden">
              <h3 className="font-bold text-xs uppercase text-primary border-b border-border pb-2 mb-3">
                {viewingKarigar
                  ? `Metal Ledger: ${viewingKarigar.name} (${viewingKarigar.karigarCode})`
                  : 'Karigar Metal Ledger (Fine Grams)'}
              </h3>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="py-1.5 px-2">Date</th>
                      <th className="py-1.5 px-2">Doc No</th>
                      <th className="py-1.5 px-2 text-right">Issued (g)</th>
                      <th className="py-1.5 px-2 text-right">Received (g)</th>
                      <th className="py-1.5 px-2 text-right">Balance (g)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {selectedKarigarLedger.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-mono text-[11px]">{e.entryDate}</td>
                        <td className="py-1.5 px-2 font-mono font-semibold">{e.documentNumber}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-rose-600 dark:text-rose-400">
                          {e.fineIssued > 0 ? `+${e.fineIssued.toFixed(3)}` : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {e.fineReceived > 0 ? `-${e.fineReceived.toFixed(3)}` : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-primary">
                          {e.runningFineBalance.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                    {selectedKarigarLedger.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                          Select a karigar to inspect fine metal entries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {showCreateOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              New Manufacturing / Production Order
            </h2>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Item to Produce:</label>
                <select
                  value={orderForm.itemId}
                  onChange={(e) => setOrderForm({ ...orderForm, itemId: e.target.value })}
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                >
                  <option value="">Select Jewellery Item</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.item_name} ({i.metal_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Assigned Karigar:</label>
                <select
                  value={orderForm.karigarId}
                  onChange={(e) => setOrderForm({ ...orderForm, karigarId: e.target.value })}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Planned Pieces:</label>
                  <input
                    type="number"
                    min="1"
                    value={orderForm.plannedPcs}
                    onChange={(e) => setOrderForm({ ...orderForm, plannedPcs: parseInt(e.target.value) || 1 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Target Net Weight (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={orderForm.plannedNetWeight}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        plannedNetWeight: parseFloat(e.target.value) || 0,
                        plannedGrossWeight: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Expected Delivery Date:</label>
                <input
                  type="date"
                  value={orderForm.expectedDeliveryDate}
                  onChange={(e) => setOrderForm({ ...orderForm, expectedDeliveryDate: e.target.value })}
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateOrderModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Create Order
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
              Issue Raw Metal / Material to Karigar
            </h2>
            <form onSubmit={handleIssueMaterial} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Gross Weight (g):</label>
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
                    step="0.1"
                    value={issueForm.tunch}
                    onChange={(e) => setIssueForm({ ...issueForm, tunch: parseFloat(e.target.value) || 100 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-2 bg-muted/40 rounded-lg border border-border flex justify-between font-mono">
                <span className="text-muted-foreground">Calculated Fine Gold Issue:</span>
                <strong className="text-primary">
                  {((issueForm.netWeight * issueForm.tunch) / 100).toFixed(3)} g
                </strong>
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

      {/* FINISHED RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Receive Finished Jewellery & Create Stock Tag
            </h2>
            <form onSubmit={handleReceiveGoods} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Received Pcs:</label>
                  <input
                    type="number"
                    min="1"
                    value={receiptForm.pcs}
                    onChange={(e) => setReceiptForm({ ...receiptForm, pcs: parseInt(e.target.value) || 1 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Gross Wt (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={receiptForm.grossWeight}
                    onChange={(e) =>
                      setReceiptForm({
                        ...receiptForm,
                        grossWeight: parseFloat(e.target.value) || 0,
                        netWeight: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Net Wt (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={receiptForm.netWeight}
                    onChange={(e) => setReceiptForm({ ...receiptForm, netWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Wastage %:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={receiptForm.wastagePercent}
                    onChange={(e) => setReceiptForm({ ...receiptForm, wastagePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Process Loss (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={receiptForm.processLossWeight}
                    onChange={(e) =>
                      setReceiptForm({ ...receiptForm, processLossWeight: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Labour Rate (₹/g):</label>
                  <input
                    type="number"
                    value={receiptForm.labourRate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, labourRate: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Receive & Tag Physical Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KARIGAR MODAL */}
      {showKarigarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">Register New Karigar</h2>
            <form onSubmit={handleCreateKarigar} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Karigar Name:</label>
                <input
                  type="text"
                  value={karigarForm.name}
                  onChange={(e) => setKarigarForm({ ...karigarForm, name: e.target.value })}
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Mobile:</label>
                <input
                  type="text"
                  value={karigarForm.mobile}
                  onChange={(e) => setKarigarForm({ ...karigarForm, mobile: e.target.value })}
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Specialization:</label>
                <input
                  type="text"
                  value={karigarForm.specialization}
                  onChange={(e) => setKarigarForm({ ...karigarForm, specialization: e.target.value })}
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowKarigarModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Save Karigar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL */}
      {showSettlementModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Record Karigar Settlement (Labour / Metal)
            </h2>
            <form onSubmit={handleSettleKarigar} className="space-y-3">
              <div>
                <label className="block text-muted-foreground mb-1">Karigar:</label>
                <select
                  value={settlementForm.karigarId}
                  onChange={(e) => setSettlementForm({ ...settlementForm, karigarId: e.target.value })}
                  required
                  className="w-full h-8 px-2 bg-background border border-input rounded-lg"
                >
                  <option value="">Select Karigar</option>
                  {karigars.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.fineGoldBalance.toFixed(3)}g fine gold)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Cash Paid (₹):</label>
                  <input
                    type="number"
                    value={settlementForm.amountPaid}
                    onChange={(e) => setSettlementForm({ ...settlementForm, amountPaid: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Fine Metal Settled (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={settlementForm.fineMetalSettled}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, fineMetalSettled: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2 bg-background border border-input rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="h-8 px-3 bg-muted rounded-lg font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Save Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManufacturingHubScreen
