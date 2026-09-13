import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import type {
  KarigarRecord,
  ManufacturingOrderRecord,
  ManufacturingReconciliationSummary,
  KarigarMetalLedgerRecord
} from '@shared/types/manufacturing'
import { formatDate, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type MfgTab = 'ORDERS' | 'MATERIAL_ISSUE' | 'RECEIPTS' | 'RECONCILIATION' | 'KARIGARS'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  APPROVED: { label: 'Approved', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
}

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
  const [toastMessage, setToastMessage] = useState<string | null>(null)

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
    specialization: 'Handmade Jewellery'
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
      setOrders(orderList || [])
      setKarigars(karigarList || [])
      setItems(itemList || [])

      if (karigarList && karigarList.length > 0 && !viewingKarigar) {
        setViewingKarigar(karigarList[0])
        const ledger = await window.api.manufacturing.getKarigarMetalLedger({ karigarId: karigarList[0].id })
        setSelectedKarigarLedger(ledger || [])
      }

      if (selectedOrderId) {
        const recon = await window.api.manufacturing.getReconciliation(selectedOrderId)
        setReconSummary(recon)
      } else if (orderList && orderList.length > 0) {
        setSelectedOrderId(orderList[0].id)
        const recon = await window.api.manufacturing.getReconciliation(orderList[0].id)
        setReconSummary(recon)
      }
    } catch (err: any) {
      console.error('Error loading manufacturing data:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, search, selectedOrderId, viewingKarigar])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Computed KPIs
  const metrics = useMemo(() => {
    const activeCount = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length
    const totalIssued = orders.reduce((acc, o) => acc + (o.totalIssuedFine || 0), 0)
    const totalReceived = orders.reduce((acc, o) => acc + (o.totalFinishedFine || 0), 0)
    const netHolding = karigars.reduce((acc, k) => acc + (k.fineGoldBalance || 0), 0)

    return {
      activeCount,
      totalIssued,
      totalReceived,
      netHolding
    }
  }, [orders, karigars])

  const handleSelectOrderForRecon = async (orderId: string) => {
    setSelectedOrderId(orderId)
    setActiveTab('RECONCILIATION')
    try {
      const recon = await window.api.manufacturing.getReconciliation(orderId)
      setReconSummary(recon)
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.createOrder(orderForm)
      setShowCreateOrderModal(false)
      setToastMessage('✓ Manufacturing order created successfully!')
      setOrderForm({
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
      void loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Issue Material
  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.issueMaterial(issueForm)
      setShowIssueModal(false)
      setToastMessage('✓ Material issued to karigar successfully!')
      void loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Receive Finished Goods
  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.receiveFinishedGoods(receiptForm)
      setShowReceiptModal(false)
      setToastMessage('✓ Finished goods received and stock item tagged!')
      void loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Create Karigar
  const handleCreateKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.createKarigar(karigarForm)
      setShowKarigarModal(false)
      setToastMessage('✓ Karigar registered successfully!')
      setKarigarForm({
        name: '',
        mobile: '',
        address: '',
        specialization: 'Handmade Jewellery'
      })
      void loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Settle Karigar
  const handleSettleKarigar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.manufacturing.settleKarigar(settlementForm)
      setShowSettlementModal(false)
      setToastMessage('✓ Settlement recorded successfully!')
      setSettlementForm({
        karigarId: '',
        settlementDate: dayjs().format('YYYY-MM-DD'),
        settlementType: 'CASH',
        amountPaid: 0,
        fineMetalSettled: 0,
        paymentReference: '',
        notes: ''
      })
      void loadData()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  const handleViewMetalLedger = async (k: KarigarRecord) => {
    setViewingKarigar(k)
    try {
      const ledger = await window.api.manufacturing.getKarigarMetalLedger({ karigarId: k.id })
      setSelectedKarigarLedger(ledger || [])
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* Top Banner & Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚒️</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Job Work &amp; Jewellery Manufacturing Engine</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
                KARIGAR DESK
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Job card tracking, raw metal issue, finished goods tagging, and Karigar metal reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh Manufacturing Hub"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateOrderModal(true)}
            className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>New Manufacturing Order</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Close Screen"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col min-h-0">
        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Metric KPI Cards Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Production Orders</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900">{metrics.activeCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">In-progress batches</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fine Gold Issued</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-amber-700">{formatWeight(metrics.totalIssued, 'g')}</span>
              <span className="text-[11px] text-slate-500 font-medium">Raw metal with karigars</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Finished Fine Received</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-emerald-700">{formatWeight(metrics.totalReceived, 'g')}</span>
              <span className="text-[11px] text-slate-500 font-medium">Crafted items received</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Karigar Net Metal Holding</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-amber-950">{formatWeight(metrics.netHolding, 'g')}</span>
              <span className="text-[11px] text-amber-800 font-semibold">Net balance with artisans</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'ORDERS'
                  ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Production Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MATERIAL_ISSUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'MATERIAL_ISSUE'
                  ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Material Issue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RECEIPTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'RECEIPTS'
                  ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Finished Receipts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RECONCILIATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'RECONCILIATION'
                  ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Metal Reconciliation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('KARIGARS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'KARIGARS'
                  ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Karigar Ledger &amp; Directory
            </button>
          </div>

          {activeTab === 'ORDERS' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order number, item, or karigar..."
                className="w-64 h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: PRODUCTION ORDERS */}
        {activeTab === 'ORDERS' && (
          <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">Order No</th>
                    <th className="py-2.5 px-3">Karigar</th>
                    <th className="py-2.5 px-3">Item / Design</th>
                    <th className="py-2.5 px-2 text-center">Pcs</th>
                    <th className="py-2.5 px-2 text-right">Target Net</th>
                    <th className="py-2.5 px-2 text-right">Fine Issued</th>
                    <th className="py-2.5 px-2 text-right">Fine Received</th>
                    <th className="py-2.5 px-2 text-right">Bal Fine</th>
                    <th className="py-2.5 px-3 text-center">Delivery Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const statusCfg = STATUS_CONFIG[o.status] || {
                      label: o.status,
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                      border: 'border-slate-200'
                    }
                    return (
                      <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{o.orderNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{o.karigarName}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">{o.itemName}</span>
                            {o.purityName && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {o.purityName}
                              </span>
                            )}
                          </div>
                          {o.notes && <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">{o.notes}</div>}
                        </td>
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700">{o.plannedPcs}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatWeight(o.plannedNetWeight, 'g')}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-amber-700">
                          {formatWeight(o.totalIssuedFine, 'g')}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-emerald-700">
                          {formatWeight(o.totalFinishedFine, 'g')}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-rose-700">
                          {formatWeight(o.unreconciledFine, 'g')}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                          {formatDate(o.expectedDeliveryDate)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
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
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
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
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Receive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectOrderForRecon(o.id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Audit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {orders.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <div className="text-2xl mb-1">📋</div>
                        <div className="font-semibold text-slate-600">No manufacturing orders found</div>
                        <div className="text-[11px]">Click "+ New Manufacturing Order" to initiate job work</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MATERIAL ISSUE TAB */}
        {activeTab === 'MATERIAL_ISSUE' && (
          <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-hidden">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900">Raw Metal &amp; Gemstone Issue Management</h2>
                <p className="text-xs text-slate-500 font-medium">Issue gold, silver bars, wires, or diamonds to assigned karigars</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(true)}
                className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                <span>+</span>
                <span>Issue Raw Metal to Karigar</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">Order No</th>
                    <th className="py-2.5 px-3">Karigar</th>
                    <th className="py-2.5 px-3">Item to Manufacture</th>
                    <th className="py-2.5 px-2 text-right">Target Net</th>
                    <th className="py-2.5 px-2 text-right">Total Fine Issued</th>
                    <th className="py-2.5 px-2 text-right">Unreconciled Fine</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const statusCfg = STATUS_CONFIG[o.status] || {
                      label: o.status,
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                      border: 'border-slate-200'
                    }
                    return (
                      <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{o.orderNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{o.karigarName}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{o.itemName}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatWeight(o.plannedNetWeight, 'g')}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-amber-700">
                          {formatWeight(o.totalIssuedFine, 'g')}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-rose-700">
                          {formatWeight(o.unreconciledFine, 'g')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
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
                            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            + Issue Metal
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FINISHED RECEIPTS TAB */}
        {activeTab === 'RECEIPTS' && (
          <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-hidden">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900">Finished Jewellery Receipts &amp; Stock Tagging</h2>
                <p className="text-xs text-slate-500 font-medium">Receive crafted items, apply labour charges, and generate barcode tags</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                <span>+</span>
                <span>Receive Finished Goods</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">Order No</th>
                    <th className="py-2.5 px-3">Karigar</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2 text-center">Target Pcs</th>
                    <th className="py-2.5 px-2 text-right">Target Net</th>
                    <th className="py-2.5 px-2 text-right">Fine Received</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const statusCfg = STATUS_CONFIG[o.status] || {
                      label: o.status,
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                      border: 'border-slate-200'
                    }
                    return (
                      <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{o.orderNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{o.karigarName}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{o.itemName}</td>
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700">{o.plannedPcs}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatWeight(o.plannedNetWeight, 'g')}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-emerald-700">
                          {formatWeight(o.totalFinishedFine, 'g')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
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
                            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            Receive &amp; Tag
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: METAL RECONCILIATION */}
        {activeTab === 'RECONCILIATION' && (
          <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-auto">
            {/* Order Selector */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Select Production Order for Audit:</span>
                <select
                  value={selectedOrderId || ''}
                  onChange={(e) => handleSelectOrderForRecon(e.target.value)}
                  className="h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.itemName} ({o.karigarName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {reconSummary ? (
              <div className="max-w-4xl mx-auto w-full space-y-4">
                {/* Header Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-2xs">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Reconciliation Audit: {reconSummary.order.orderNumber}</span>
                      <span className="text-xs font-normal text-slate-500">({reconSummary.order.itemName})</span>
                    </h2>
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                      Assigned Karigar: <strong className="text-slate-900">{reconSummary.order.karigarName}</strong> | Planned:{' '}
                      <strong className="text-slate-900">{reconSummary.order.plannedPcs} pcs</strong> ({formatWeight(reconSummary.order.plannedNetWeight, 'g')})
                    </div>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold border ${
                      reconSummary.isReconciled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {reconSummary.isReconciled ? '✓ RECONCILED' : '⚠️ UNRECONCILED DIFFERENCE'}
                  </span>
                </div>

                {/* Audit Grid */}
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200 text-center shadow-2xs">
                    <div className="text-amber-900 font-bold text-[11px] uppercase tracking-tight">Total Fine Issued</div>
                    <div className="text-lg font-extrabold text-amber-800 mt-1">
                      {formatWeight(reconSummary.totalFineIssued, 'g')}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
                    <div className="text-slate-600 font-bold text-[11px] uppercase tracking-tight">Unused Returned</div>
                    <div className="text-lg font-extrabold text-slate-900 mt-1">
                      {formatWeight(reconSummary.totalFineReturned, 'g')}
                    </div>
                  </div>

                  <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200 text-center shadow-2xs">
                    <div className="text-emerald-900 font-bold text-[11px] uppercase tracking-tight">Finished Goods Fine</div>
                    <div className="text-lg font-extrabold text-emerald-800 mt-1">
                      {formatWeight(reconSummary.totalFineReceived, 'g')}
                    </div>
                  </div>

                  <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-200 text-center shadow-2xs">
                    <div className="text-indigo-900 font-bold text-[11px] uppercase tracking-tight">Approved Loss &amp; Wastage</div>
                    <div className="text-lg font-extrabold text-indigo-800 mt-1">
                      {formatWeight(reconSummary.totalApprovedLoss, 'g')}
                    </div>
                  </div>
                </div>

                {/* Metal Balance Equation Box */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs shadow-2xs">
                  <h3 className="font-bold text-xs uppercase tracking-tight text-slate-800 border-b border-slate-100 pb-2">
                    Canonical Metal Reconciliation Formula
                  </h3>
                  <div className="text-xs py-3 px-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center flex-wrap gap-2">
                    <span className="text-slate-700 font-medium">
                      {reconSummary.totalFineIssued.toFixed(3)}g (Issued) - {reconSummary.totalFineReturned.toFixed(3)}g (Returned) -{' '}
                      {reconSummary.totalFineReceived.toFixed(3)}g (Finished) - {reconSummary.totalApprovedLoss.toFixed(3)}g (Loss)
                    </span>
                    <strong
                      className={`text-sm font-bold ${
                        reconSummary.isReconciled ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      = {reconSummary.unreconciledDifference.toFixed(3)} g difference
                    </strong>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {reconSummary.isReconciled
                      ? 'All fine metal issued has been 100% accounted for across finished goods, approved burning losses, and returned scrap.'
                      : 'The unreconciled metal weight is currently held by the karigar for ongoing fabrication or pending return adjustment.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs py-16">
                Select an order from the dropdown above to inspect reconciliation.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: KARIGAR DIRECTORY & METAL LEDGER */}
        {activeTab === 'KARIGARS' && (
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* Left: Karigars List */}
            <div className="w-1/2 flex flex-col gap-3 min-h-0 overflow-hidden">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center text-xs shrink-0">
                <div>
                  <span className="font-bold text-slate-900">Registered Artisans &amp; Karigars</span>
                  <div className="text-xs text-slate-500 font-medium">Select artisan to view ledger balance</div>
                </div>
                <div className="space-x-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowSettlementModal(true)}
                    className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    Settle Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKarigarModal(true)}
                    className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                    style={{ color: '#ffffff' }}
                  >
                    + Add Karigar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Specialization</th>
                      <th className="py-2.5 px-3 text-right">Fine Gold Bal</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {karigars.map((k) => (
                      <tr
                        key={k.id}
                        onClick={() => handleViewMetalLedger(k)}
                        className={`hover:bg-amber-50/30 cursor-pointer transition-colors ${
                          viewingKarigar?.id === k.id ? 'bg-amber-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{k.karigarCode}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{k.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{k.specialization}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                          {formatWeight(k.fineGoldBalance, 'g')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewMetalLedger(k)
                            }}
                            className="px-2.5 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-semibold shadow-2xs cursor-pointer"
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
            <div className="w-1/2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden">
              <div className="border-b border-slate-100 pb-2.5 mb-3 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-xs uppercase tracking-tight text-slate-900">
                  {viewingKarigar
                    ? `Metal Ledger: ${viewingKarigar.name} (${viewingKarigar.karigarCode})`
                    : 'Karigar Metal Ledger (Fine Grams)'}
                </h3>
                {viewingKarigar && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Net Balance: {formatWeight(viewingKarigar.fineGoldBalance, 'g')}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                    <tr>
                      <th className="py-2 px-2.5">Date</th>
                      <th className="py-2 px-2.5">Doc No</th>
                      <th className="py-2 px-2 text-right">Issued (g)</th>
                      <th className="py-2 px-2 text-right">Received (g)</th>
                      <th className="py-2 px-2.5 text-right">Balance (g)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedKarigarLedger.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2.5 text-slate-600 font-medium">{formatDate(e.entryDate)}</td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900">
                          {e.documentNumber}
                          {e.narration && <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs">{e.narration}</div>}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-rose-700">
                          {e.fineIssued > 0 ? `+${e.fineIssued.toFixed(3)}` : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-emerald-700">
                          {e.fineReceived > 0 ? `-${e.fineReceived.toFixed(3)}` : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-amber-800">
                          {formatWeight(e.runningFineBalance, 'g')}
                        </td>
                      </tr>
                    ))}
                    {selectedKarigarLedger.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          Select a karigar to inspect fine metal ledger entries.
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              New Manufacturing / Production Order
            </h2>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item to Produce:</label>
                <select
                  value={orderForm.itemId}
                  onChange={(e) => setOrderForm({ ...orderForm, itemId: e.target.value })}
                  required
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
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
                <label className="block font-semibold text-slate-700 mb-1">Assigned Karigar:</label>
                <select
                  value={orderForm.karigarId}
                  onChange={(e) => setOrderForm({ ...orderForm, karigarId: e.target.value })}
                  required
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
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
                  <label className="block font-semibold text-slate-700 mb-1">Planned Pieces:</label>
                  <input
                    type="number"
                    min="1"
                    value={orderForm.plannedPcs}
                    onChange={(e) => setOrderForm({ ...orderForm, plannedPcs: parseInt(e.target.value) || 1 })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Net Wt (g):</label>
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
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected Delivery Date:</label>
                <input
                  type="date"
                  value={orderForm.expectedDeliveryDate}
                  onChange={(e) => setOrderForm({ ...orderForm, expectedDeliveryDate: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Production Notes:</label>
                <textarea
                  rows={2}
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Design specifications, casting details..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateOrderModal(false)}
                  className="h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  style={{ color: '#ffffff' }}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Issue Raw Metal / Material to Karigar
            </h2>
            <form onSubmit={handleIssueMaterial} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Production Order:</label>
                <select
                  value={issueForm.orderId}
                  onChange={(e) => {
                    const sel = orders.find((o) => o.id === e.target.value)
                    setIssueForm({
                      ...issueForm,
                      orderId: e.target.value,
                      karigarId: sel?.karigarId || issueForm.karigarId,
                      metalType: sel?.metalType || 'GOLD',
                      purityName: sel?.purityName || '22K'
                    })
                  }}
                  required
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                >
                  <option value="">Select Order</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.itemName} ({o.karigarName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gross Weight (g):</label>
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
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tunch / Purity %:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={issueForm.tunch}
                    onChange={(e) => setIssueForm({ ...issueForm, tunch: parseFloat(e.target.value) || 100 })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex justify-between text-xs">
                <span className="text-amber-900 font-medium">Calculated Fine Gold:</span>
                <strong className="text-amber-950 font-bold">
                  {((issueForm.netWeight * issueForm.tunch) / 100).toFixed(3)} g
                </strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Date:</label>
                <input
                  type="date"
                  value={issueForm.issueDate}
                  onChange={(e) => setIssueForm({ ...issueForm, issueDate: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  style={{ color: '#ffffff' }}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Receive Finished Jewellery &amp; Create Stock Tag
            </h2>
            <form onSubmit={handleReceiveGoods} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Production Order:</label>
                <select
                  value={receiptForm.orderId}
                  onChange={(e) => {
                    const sel = orders.find((o) => o.id === e.target.value)
                    setReceiptForm({
                      ...receiptForm,
                      orderId: e.target.value,
                      karigarId: sel?.karigarId || receiptForm.karigarId,
                      itemId: sel?.itemId || receiptForm.itemId,
                      purityName: sel?.purityName || '22K'
                    })
                  }}
                  required
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                >
                  <option value="">Select Order</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.itemName} ({o.karigarName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Received Pcs:</label>
                  <input
                    type="number"
                    min="1"
                    value={receiptForm.pcs}
                    onChange={(e) => setReceiptForm({ ...receiptForm, pcs: parseInt(e.target.value) || 1 })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gross Wt (g):</label>
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
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Net Wt (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={receiptForm.netWeight}
                    onChange={(e) => setReceiptForm({ ...receiptForm, netWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wastage %:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={receiptForm.wastagePercent}
                    onChange={(e) => setReceiptForm({ ...receiptForm, wastagePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Process Loss (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={receiptForm.processLossWeight}
                    onChange={(e) =>
                      setReceiptForm({ ...receiptForm, processLossWeight: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Labour Rate (₹/g):</label>
                  <input
                    type="number"
                    value={receiptForm.labourRate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, labourRate: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  Receive &amp; Tag Physical Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KARIGAR MODAL */}
      {showKarigarModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Register New Karigar</h2>
            <form onSubmit={handleCreateKarigar} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Karigar / Artisan Name:</label>
                <input
                  type="text"
                  value={karigarForm.name}
                  onChange={(e) => setKarigarForm({ ...karigarForm, name: e.target.value })}
                  required
                  placeholder="e.g. Ramesh Soni"
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Contact:</label>
                <input
                  type="text"
                  value={karigarForm.mobile}
                  onChange={(e) => setKarigarForm({ ...karigarForm, mobile: e.target.value })}
                  placeholder="98XXXXXXXX"
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization / Craft:</label>
                <input
                  type="text"
                  value={karigarForm.specialization}
                  onChange={(e) => setKarigarForm({ ...karigarForm, specialization: e.target.value })}
                  placeholder="Handmade Antique, Setting, Casting, Polish..."
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowKarigarModal(false)}
                  className="h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  style={{ color: '#ffffff' }}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Record Karigar Settlement (Labour / Metal)
            </h2>
            <form onSubmit={handleSettleKarigar} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Karigar:</label>
                <select
                  value={settlementForm.karigarId}
                  onChange={(e) => setSettlementForm({ ...settlementForm, karigarId: e.target.value })}
                  required
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                >
                  <option value="">Select Karigar</option>
                  {karigars.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({formatWeight(k.fineGoldBalance, 'g')} fine gold)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cash Paid (₹):</label>
                  <input
                    type="number"
                    value={settlementForm.amountPaid}
                    onChange={(e) => setSettlementForm({ ...settlementForm, amountPaid: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fine Metal Settled (g):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={settlementForm.fineMetalSettled}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, fineMetalSettled: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Reference / Notes:</label>
                <input
                  type="text"
                  value={settlementForm.paymentReference}
                  onChange={(e) => setSettlementForm({ ...settlementForm, paymentReference: e.target.value })}
                  placeholder="UPI / Cheque / Cash voucher..."
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  style={{ color: '#ffffff' }}
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
