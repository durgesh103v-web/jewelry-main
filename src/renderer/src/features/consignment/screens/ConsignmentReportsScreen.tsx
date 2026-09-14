import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiDollarSign,
  FiDownload,
  FiFileText,
  FiLayers,
  FiPackage,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShoppingCart,
  FiX
} from 'react-icons/fi'
import type {
  ConsignmentInwardRecord,
  ConsignmentItemRecord,
  ConsignmentSettlementRecord,
  ConsignmentDashboardSummary,
  ConsignmentStatus,
  ConsignmentSettlementStatus
} from '@shared/types/consignment'
import type { SupplierRecord } from '@shared/types/supplier'
import { DataTable, type Column } from '@components/ui'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { SupplierSelector } from '../../purchases/components/SupplierSelector'
import { ConsignmentDetailScreen } from './ConsignmentDetailScreen'

export interface ConsignmentReportsScreenProps {
  onClose?: () => void
  onNavigate?: (id: string, label: string, module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility') => void
  onBack?: () => void
}

type ReportTab = 'REGISTER' | 'STOCK' | 'SOLD' | 'LIABILITY' | 'SETTLEMENTS'

export const ConsignmentReportsScreen: React.FC<ConsignmentReportsScreenProps> = ({
  onClose,
  onNavigate,
  onBack
}) => {
  // Navigation & Drilldown State
  const [drilldownInwardId, setDrilldownInwardId] = useState<string | null>(null)

  // Tab State
  const [activeTab, setActiveTab] = useState<ReportTab>('REGISTER')

  // Filter States
  const [datePreset, setDatePreset] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY' | 'ALL'>('THIS_MONTH')
  const [startDate, setStartDate] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [liabilityOnlyPending, setLiabilityOnlyPending] = useState<boolean>(true)

  // Data States
  const [dashboard, setDashboard] = useState<ConsignmentDashboardSummary | null>(null)
  const [registerRows, setRegisterRows] = useState<ConsignmentInwardRecord[]>([])
  const [stockRows, setStockRows] = useState<ConsignmentItemRecord[]>([])
  const [soldRows, setSoldRows] = useState<ConsignmentItemRecord[]>([])
  const [settlementRows, setSettlementRows] = useState<ConsignmentSettlementRecord[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Preset Date Range Setter
  const handleDatePreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY' | 'ALL') => {
    setDatePreset(preset)
    const today = dayjs()
    if (preset === 'TODAY') {
      const d = today.format('YYYY-MM-DD')
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
    } else if (preset === 'ALL') {
      setStartDate('')
      setEndDate('')
    }
  }

  // Load backend authoritative report data
  const loadReportData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Fetch dashboard KPIs
      const dash = await window.api.consignment.getDashboard()
      setDashboard(dash)

      // 2. Fetch data based on active tab
      const supplierId = selectedSupplier?.id || undefined
      const search = searchQuery.trim() || undefined

      if (activeTab === 'REGISTER') {
        const rows = await window.api.consignment.listInwards({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          settlementStatus: settlementStatusFilter === 'ALL' ? undefined : settlementStatusFilter,
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setRegisterRows(rows || [])
      } else if (activeTab === 'STOCK') {
        const rows = await window.api.consignment.listItems({
          status: 'IN_SHOWROOM',
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setStockRows(rows || [])
      } else if (activeTab === 'SOLD') {
        const rows = await window.api.consignment.listItems({
          status: 'SOLD',
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setSoldRows(rows || [])
      } else if (activeTab === 'LIABILITY') {
        const rows = await window.api.consignment.listInwards({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          settlementStatus: settlementStatusFilter === 'ALL' ? undefined : settlementStatusFilter,
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setRegisterRows(rows || [])
      } else if (activeTab === 'SETTLEMENTS') {
        const rows = await window.api.consignment.getSettlements({
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setSettlementRows(rows || [])
      }
    } catch (err: unknown) {
      console.error('Failed to load consignment reports:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [
    activeTab,
    startDate,
    endDate,
    selectedSupplier,
    statusFilter,
    settlementStatusFilter,
    searchQuery
  ])

  useEffect(() => {
    void loadReportData()
  }, [loadReportData])

  // Liability filtered rows
  const filteredLiabilityRows = useMemo(() => {
    return registerRows.filter((r) => {
      const hasRecognized = (r.totalSoldVendorCost ?? 0) > 0
      if (!hasRecognized) return false
      if (liabilityOnlyPending) {
        return (r.outstandingLiability ?? 0) > 0
      }
      return true
    })
  }, [registerRows, liabilityOnlyPending])

  // CSV Export
  const handleExportCsv = () => {
    let rows: any[] = []
    const filename = `consignment_${activeTab.toLowerCase()}_${startDate || 'all'}_to_${endDate || 'all'}.csv`

    if (activeTab === 'REGISTER') {
      rows = registerRows.map((r) => ({
        'Memo Number': r.consignmentNumber,
        'Vendor Name': r.supplierName || '',
        'Inward Date': r.inwardDate,
        'Return Due Date': r.expectedReturnDate || '',
        'Total Pieces': r.totalPieces,
        'Sold Pieces': r.soldPieces ?? 0,
        'Returned Pieces': r.returnedPieces ?? 0,
        'Total Gross Weight': r.totalGrossWeight,
        'Total Vendor Value': r.totalVendorCost,
        'Recognized Sold Cost': r.totalSoldVendorCost ?? 0,
        'Settled Amount': r.totalSettledAmount ?? 0,
        'Outstanding Liability': r.outstandingLiability ?? 0,
        'Physical Status': r.status,
        'Settlement Status': r.settlementStatus || 'UNSETTLED'
      }))
    } else if (activeTab === 'STOCK') {
      rows = stockRows.map((it) => ({
        Barcode: it.barcode || it.stockItemCode,
        'Item Name': it.itemName,
        'Vendor Code': it.vendorItemCode || '',
        'Vendor Name': it.supplierName || '',
        'Memo Number': it.consignmentNumber || '',
        'Inward Date': it.inwardDate || '',
        'Due Date': it.expectedReturnDate || '',
        Purity: it.purityName,
        Tunch: it.tunch,
        'Gross Weight': it.grossWeight,
        'Net Weight': it.netWeight,
        'Fine Weight': it.fineWeight,
        'Vendor Cost': it.vendorCost,
        'Retail Price': it.retailPrice,
        Status: it.status
      }))
    } else if (activeTab === 'SOLD') {
      rows = soldRows.map((it) => ({
        Barcode: it.barcode || it.stockItemCode,
        'Item Name': it.itemName,
        'Vendor Name': it.supplierName || '',
        'Memo Number': it.consignmentNumber || '',
        'Sale Date': it.saleDate || it.soldAt || '',
        'Sales Invoice': it.salesInvoiceNumber || '',
        'Gross Weight': it.grossWeight,
        'Net Weight': it.netWeight,
        'Recognized Vendor Cost': it.vendorCost,
        'Memo Settlement Status': it.inwardSettlementStatus || ''
      }))
    } else if (activeTab === 'LIABILITY') {
      rows = filteredLiabilityRows.map((r) => ({
        'Memo Number': r.consignmentNumber,
        'Vendor Name': r.supplierName || '',
        'Inward Date': r.inwardDate,
        'Recognized Payable': r.totalSoldVendorCost ?? 0,
        'Settled to Date': r.totalSettledAmount ?? 0,
        'Outstanding Balance': r.outstandingLiability ?? 0,
        'Settlement Status': r.settlementStatus || 'UNSETTLED',
        'Sold Pieces': r.soldPieces ?? 0
      }))
    } else if (activeTab === 'SETTLEMENTS') {
      rows = settlementRows.map((s) => ({
        'Settlement #': s.settlementNumber,
        'Settlement Date': s.settlementDate,
        'Memo Number': s.consignmentNumber || '',
        'Vendor Name': s.supplierName || '',
        'Settled Amount': s.settledAmount,
        'Payment Method': s.paymentMethod,
        'Payment Reference': s.paymentReference || '',
        'Recorded By': s.createdBy || 'Admin',
        Notes: s.notes || ''
      }))
    }

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

  // Physical status badge renderer
  const renderPhysicalStatusBadge = (status: ConsignmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
            ACTIVE
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
            PARTIAL
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
            COMPLETED
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
            CLOSED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        )
    }
  }

  // Financial settlement status badge renderer
  const renderSettlementStatusBadge = (status?: ConsignmentSettlementStatus) => {
    switch (status) {
      case 'SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
            SETTLED
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
            PARTIALLY PAID
          </span>
        )
      case 'UNSETTLED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
            UNSETTLED
          </span>
        )
    }
  }

  // Column definitions for Tab 1: REGISTER
  const registerColumns = useMemo((): Column<ConsignmentInwardRecord>[] => [
    {
      key: 'consignmentNumber',
      header: 'MEMO #',
      render: (r) => (
        <span className="font-mono font-bold text-amber-950 hover:underline">
          {r.consignmentNumber}
        </span>
      )
    },
    {
      key: 'supplierName',
      header: 'VENDOR / CONSIGNOR',
      render: (r) => (
        <span className="font-bold text-slate-900 truncate max-w-[220px] block" title={r.supplierName}>
          {r.supplierName || 'Unknown Vendor'}
        </span>
      )
    },
    {
      key: 'inwardDate',
      header: 'INWARD DATE',
      render: (r) => <span className="font-mono text-slate-600">{formatDate(r.inwardDate)}</span>
    },
    {
      key: 'expectedReturnDate',
      header: 'DUE DATE',
      render: (r) => (
        <span className="font-mono text-slate-500">
          {r.expectedReturnDate ? formatDate(r.expectedReturnDate) : '-'}
        </span>
      )
    },
    {
      key: 'totalPieces',
      header: 'PIECES',
      align: 'center',
      render: (r) => (
        <div className="font-mono text-center">
          <span className="font-bold text-slate-900">{r.totalPieces}</span>
          <span className="text-[10px] text-slate-500 block">
            {r.soldPieces ?? 0}s • {r.returnedPieces ?? 0}r
          </span>
        </div>
      )
    },
    {
      key: 'totalGrossWeight',
      header: 'GROSS WT',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-slate-900">
          {formatWeight(r.totalGrossWeight)}
        </span>
      )
    },
    {
      key: 'totalVendorCost',
      header: 'MEMO VALUE',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-slate-900">
          {formatCurrency(r.totalVendorCost)}
        </span>
      )
    },
    {
      key: 'totalSoldVendorCost',
      header: 'RECOGNIZED COST',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-purple-700">
          {formatCurrency(r.totalSoldVendorCost ?? 0)}
        </span>
      )
    },
    {
      key: 'totalSettledAmount',
      header: 'SETTLED AMOUNT',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-emerald-700">
          {formatCurrency(r.totalSettledAmount ?? 0)}
        </span>
      )
    },
    {
      key: 'outstandingLiability',
      header: 'OUTSTANDING',
      align: 'right',
      render: (r) => {
        const out = r.outstandingLiability ?? 0
        return (
          <span className={`font-mono font-bold ${out > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {formatCurrency(out)}
          </span>
        )
      }
    },
    {
      key: 'status',
      header: 'PHYSICAL',
      align: 'center',
      render: (r) => renderPhysicalStatusBadge(r.status)
    },
    {
      key: 'settlementStatus',
      header: 'SETTLEMENT',
      align: 'center',
      render: (r) => renderSettlementStatusBadge(r.settlementStatus)
    },
    {
      key: 'actions',
      header: 'ACTION',
      align: 'center',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setDrilldownInwardId(r.id)
          }}
          className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
        >
          View Memo
        </button>
      )
    }
  ], [])

  // Column definitions for Tab 2: STOCK
  const stockColumns = useMemo((): Column<ConsignmentItemRecord>[] => [
    {
      key: 'barcode',
      header: 'BARCODE / TAG',
      render: (it) => (
        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {it.barcode || it.stockItemCode}
        </span>
      )
    },
    {
      key: 'itemName',
      header: 'ITEM NAME',
      render: (it) => (
        <span className="font-bold text-slate-900 truncate max-w-[200px] block">
          {it.itemName}
        </span>
      )
    },
    {
      key: 'supplierName',
      header: 'VENDOR / CONSIGNOR',
      render: (it) => (
        <span className="font-medium text-slate-700 truncate max-w-[180px] block">
          {it.supplierName || 'Vendor'}
        </span>
      )
    },
    {
      key: 'consignmentNumber',
      header: 'MEMO #',
      render: (it) => <span className="font-mono text-slate-600">{it.consignmentNumber || '-'}</span>
    },
    {
      key: 'inwardDate',
      header: 'INWARD DATE',
      render: (it) => <span className="font-mono text-slate-500">{formatDate(it.inwardDate || '')}</span>
    },
    {
      key: 'purityName',
      header: 'PURITY',
      align: 'center',
      render: (it) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 font-mono">
          {it.purityName || '-'}
        </span>
      )
    },
    {
      key: 'grossWeight',
      header: 'GROSS WT',
      align: 'right',
      render: (it) => <span className="font-mono font-bold text-slate-900">{formatWeight(it.grossWeight)}</span>
    },
    {
      key: 'netWeight',
      header: 'NET WT',
      align: 'right',
      render: (it) => <span className="font-mono font-bold text-slate-800">{formatWeight(it.netWeight)}</span>
    },
    {
      key: 'fineWeight',
      header: 'FINE WT',
      align: 'right',
      render: (it) => <span className="font-mono font-semibold text-amber-800">{formatWeight(it.fineWeight)}</span>
    },
    {
      key: 'vendorCost',
      header: 'VENDOR COST',
      align: 'right',
      render: (it) => <span className="font-mono font-bold text-slate-900">{formatCurrency(it.vendorCost)}</span>
    },
    {
      key: 'retailPrice',
      header: 'RETAIL PRICE',
      align: 'right',
      render: (it) => <span className="font-mono font-bold text-emerald-800">{formatCurrency(it.retailPrice)}</span>
    },
    {
      key: 'status',
      header: 'CUSTODY STATUS',
      align: 'center',
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
          IN SHOWROOM
        </span>
      )
    }
  ], [])

  // Column definitions for Tab 3: SOLD
  const soldColumns = useMemo((): Column<ConsignmentItemRecord>[] => [
    {
      key: 'barcode',
      header: 'BARCODE / TAG',
      render: (it) => (
        <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {it.barcode || it.stockItemCode}
        </span>
      )
    },
    {
      key: 'itemName',
      header: 'ITEM NAME',
      render: (it) => <span className="font-bold text-slate-900">{it.itemName}</span>
    },
    {
      key: 'supplierName',
      header: 'VENDOR / CONSIGNOR',
      render: (it) => <span className="font-medium text-slate-700">{it.supplierName || 'Vendor'}</span>
    },
    {
      key: 'consignmentNumber',
      header: 'MEMO ',
      render: (it) => <span className="font-mono text-slate-600">{it.consignmentNumber || '-'}</span>
    },
    {
      key: 'saleDate',
      header: 'SALE DATE',
      render: (it) => <span className="font-mono text-slate-600">{formatDate(it.saleDate || it.soldAt || '')}</span>
    },
    {
      key: 'salesInvoiceNumber',
      header: 'SALES INVOICE',
      render: (it) => (
        <span className="font-mono font-bold text-amber-900">
          {it.salesInvoiceNumber || '-'}
        </span>
      )
    },
    {
      key: 'grossWeight',
      header: 'GROSS WT',
      align: 'right',
      render: (it) => <span className="font-mono font-bold text-slate-900">{formatWeight(it.grossWeight)}</span>
    },
    {
      key: 'vendorCost',
      header: 'RECOGNIZED COST',
      align: 'right',
      render: (it) => (
        <span className="font-mono font-bold text-purple-700">
          {formatCurrency(it.vendorCost)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'STATUS',
      align: 'center',
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
          SOLD AT POS
        </span>
      )
    }
  ], [])

  // Column definitions for Tab 4: LIABILITY
  const liabilityColumns = useMemo((): Column<ConsignmentInwardRecord>[] => [
    {
      key: 'consignmentNumber',
      header: 'MEMO #',
      render: (r) => (
        <span className="font-mono font-bold text-amber-950 hover:underline">
          {r.consignmentNumber}
        </span>
      )
    },
    {
      key: 'supplierName',
      header: 'VENDOR / CONSIGNOR',
      render: (r) => <span className="font-bold text-slate-900">{r.supplierName || 'Vendor'}</span>
    },
    {
      key: 'inwardDate',
      header: 'INWARD DATE',
      render: (r) => <span className="font-mono text-slate-600">{formatDate(r.inwardDate)}</span>
    },
    {
      key: 'soldPieces',
      header: 'SOLD PCS',
      align: 'center',
      render: (r) => <span className="font-mono font-bold text-purple-800">{r.soldPieces ?? 0} Pcs</span>
    },
    {
      key: 'totalSoldVendorCost',
      header: 'RECOGNIZED PAYABLE',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-purple-700">
          {formatCurrency(r.totalSoldVendorCost ?? 0)}
        </span>
      )
    },
    {
      key: 'totalSettledAmount',
      header: 'SETTLED TO DATE',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-emerald-700">
          {formatCurrency(r.totalSettledAmount ?? 0)}
        </span>
      )
    },
    {
      key: 'outstandingLiability',
      header: 'OUTSTANDING BALANCE',
      align: 'right',
      render: (r) => {
        const out = r.outstandingLiability ?? 0
        return (
          <span className={`font-mono font-bold text-base ${out > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatCurrency(out)}
          </span>
        )
      }
    },
    {
      key: 'settlementStatus',
      header: 'SETTLEMENT STATUS',
      align: 'center',
      render: (r) => renderSettlementStatusBadge(r.settlementStatus)
    },
    {
      key: 'actions',
      header: 'ACTION',
      align: 'center',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setDrilldownInwardId(r.id)
          }}
          className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
        >
          Settle Now
        </button>
      )
    }
  ], [])

  // Column definitions for Tab 5: SETTLEMENTS
  const settlementColumns = useMemo((): Column<ConsignmentSettlementRecord>[] => [
    {
      key: 'settlementNumber',
      header: 'SETTLEMENT #',
      render: (s) => (
        <span className="font-mono font-bold text-emerald-900">
          {s.settlementNumber}
        </span>
      )
    },
    {
      key: 'settlementDate',
      header: 'SETTLEMENT DATE',
      render: (s) => <span className="font-mono text-slate-700">{formatDate(s.settlementDate)}</span>
    },
    {
      key: 'consignmentNumber',
      header: 'MEMO #',
      render: (s) => <span className="font-mono text-slate-600">{s.consignmentNumber || '-'}</span>
    },
    {
      key: 'supplierName',
      header: 'VENDOR NAME',
      render: (s) => <span className="font-bold text-slate-900">{s.supplierName || 'Vendor'}</span>
    },
    {
      key: 'settledAmount',
      header: 'SETTLED AMOUNT',
      align: 'right',
      render: (s) => (
        <span className="font-mono font-bold text-emerald-800 text-sm">
          {formatCurrency(s.settledAmount)}
        </span>
      )
    },
    {
      key: 'paymentMethod',
      header: 'PAYMENT METHOD',
      align: 'center',
      render: (s) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
          {s.paymentMethod}
        </span>
      )
    },
    {
      key: 'paymentReference',
      header: 'REFERENCE',
      render: (s) => <span className="font-mono text-slate-500">{s.paymentReference || '-'}</span>
    },
    {
      key: 'notes',
      header: 'REMARKS',
      render: (s) => <span className="text-slate-600 text-xs truncate max-w-[200px] block">{s.notes || '-'}</span>
    }
  ], [])

  const handleBack = onBack || onClose || (() => onNavigate?.('dashboard', 'Dashboard', 'home'))

  // If drilling down into a specific memo detail:
  if (drilldownInwardId) {
    return (
      <ConsignmentDetailScreen
        inwardId={drilldownInwardId}
        onClose={() => {
          setDrilldownInwardId(null)
          void loadReportData()
        }}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* 1. Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="h-8 px-2.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-bold rounded-lg transition-all flex items-center gap-1 border border-amber-300/80 shadow-2xs cursor-pointer active:scale-95"
            title="Go back to previous screen"
          >
            <FiArrowLeft className="w-3.5 h-3.5 text-amber-700" />
            <span>Back</span>
          </button>

          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiLayers className="w-4 h-4" />
          </div>

          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Vendor Consignment &amp; Memo Reports</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {activeTab}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Authoritative vendor custody stock, POS sales, and settlement tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading}
            className="h-8 px-3 text-xs bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export CSV of currently visible report records"
          >
            <FiDownload className="w-3.5 h-3.5 text-amber-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-8 px-3 text-xs bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
            title="Print report"
          >
            <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => void loadReportData()}
            disabled={isLoading}
            className="h-8 px-3 text-xs bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-300 hover:border-amber-300 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh report data"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer ml-1"
              title="Close Tab"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Workspace Body */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex justify-between items-center shadow-2xs shrink-0">
            <span className="flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-rose-100 text-rose-700 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 3. Top Authoritative KPI Summary Strip */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 shrink-0 text-xs">
          {/* Active Memos */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Consignment Memos
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-slate-900">
                {dashboard?.activeConsignmentsCount ?? 0}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Active</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
              <span>Overdue:</span>
              <span className={dashboard?.overdueMemosCount ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>
                {dashboard?.overdueMemosCount ?? 0} memos
              </span>
            </div>
          </div>

          {/* Showroom Custody Pieces */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Showroom Custody Stock
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-blue-900">
                {dashboard?.piecesInShowroomCount ?? 0}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Pieces</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between font-mono">
              <span>Gross Wt:</span>
              <span className="font-bold text-slate-800">
                {formatWeight(dashboard?.totalShowroomGrossWeight ?? 0)}
              </span>
            </div>
          </div>

          {/* Total Sold Pieces */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Sold Consignments (POS)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-purple-900">
                {dashboard?.piecesSoldTotal ?? 0}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Sold Pcs</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between font-mono">
              <span>Recognized Value:</span>
              <span className="font-bold text-purple-800">
                {formatCurrency(dashboard?.totalSoldVendorValue ?? 0)}
              </span>
            </div>
          </div>

          {/* Settled to Vendors */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Settled to Date
            </span>
            <div className="mt-1">
              <span className="text-xl font-extrabold font-mono text-emerald-800">
                {formatCurrency(dashboard?.totalSettlementPaid ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
              <span>Returned Pcs:</span>
              <span className="font-mono text-amber-800 font-bold">
                {dashboard?.piecesReturnedTotal ?? 0} Pcs
              </span>
            </div>
          </div>

          {/* Outstanding Due to Vendors */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Outstanding Liability
            </span>
            <div className="mt-1">
              <span
                className={`text-xl font-extrabold font-mono ${
                  (dashboard?.totalSettlementDueToSuppliers ?? 0) > 0
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {formatCurrency(dashboard?.totalSettlementDueToSuppliers ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 truncate">
              Authoritative vendor balance due
            </div>
          </div>
        </section>

        {/* 4. Global Filter Toolbar */}
        <section className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_FY', 'ALL'] as const).map((p) => {
                const isSelected = datePreset === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleDatePreset(p)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-amber-900 shadow-2xs border border-amber-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {p === 'TODAY' && 'Today'}
                    {p === 'THIS_WEEK' && 'This Week'}
                    {p === 'THIS_MONTH' && 'This Month'}
                    {p === 'THIS_FY' && 'This FY'}
                    {p === 'ALL' && 'All Time'}
                  </button>
                )
              })}
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-500 font-sans text-[11px] font-medium">
                {activeTab === 'SOLD'
                  ? 'Sale Date:'
                  : activeTab === 'SETTLEMENTS'
                    ? 'Settle Date:'
                    : 'Inward Date:'}
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-slate-400 font-sans">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Supplier / Vendor Filter */}
            <div className="w-56">
              <SupplierSelector
                supplier={selectedSupplier}
                onSelectSupplier={setSelectedSupplier}
              />
            </div>
            {selectedSupplier && (
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                title="Clear selected vendor"
              >
                Clear Vendor
              </button>
            )}

            {/* Physical Status Filter (Applicable to Register & Liability) */}
            {(activeTab === 'REGISTER' || activeTab === 'LIABILITY') && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs bg-white border border-slate-300 rounded-lg px-2 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ALL">All Physical Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PARTIALLY_SETTLED">PARTIALLY SETTLED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            )}

            {/* Settlement Status Filter */}
            {(activeTab === 'REGISTER' || activeTab === 'LIABILITY') && (
              <select
                value={settlementStatusFilter}
                onChange={(e) => setSettlementStatusFilter(e.target.value)}
                className="h-8 text-xs bg-white border border-slate-300 rounded-lg px-2 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ALL">All Financial Status</option>
                <option value="UNSETTLED">UNSETTLED</option>
                <option value="PARTIALLY_SETTLED">PARTIALLY PAID</option>
                <option value="SETTLED">SETTLED</option>
              </select>
            )}

            {/* Liability specific toggle */}
            {activeTab === 'LIABILITY' && (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-700 font-bold cursor-pointer ml-1 select-none">
                <input
                  type="checkbox"
                  checked={liabilityOnlyPending}
                  onChange={(e) => setLiabilityOnlyPending(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span>Pending Balance Due Only</span>
              </label>
            )}
          </div>

          {/* Search Box */}
          <div className="w-64 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memo, barcode, vendor..."
              className="w-full h-8 pl-8 pr-7 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
            />
            <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* 5. Report Tabs Strip */}
        <div className="flex items-center border-b border-slate-200 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('REGISTER')}
            className={`h-9 px-4 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'border-amber-600 text-amber-950 bg-amber-50/70 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FiFileText className="w-3.5 h-3.5 text-amber-700" />
            <span>Consignment Register</span>
            {registerRows.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-200/70 text-amber-900 font-extrabold">
                {registerRows.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STOCK')}
            className={`h-9 px-4 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'STOCK'
                ? 'border-amber-600 text-amber-950 bg-amber-50/70 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FiPackage className="w-3.5 h-3.5 text-blue-700" />
            <span>Vendor-Owned Stock</span>
            {stockRows.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-blue-900 font-extrabold">
                {stockRows.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SOLD')}
            className={`h-9 px-4 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'SOLD'
                ? 'border-amber-600 text-amber-950 bg-amber-50/70 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FiShoppingCart className="w-3.5 h-3.5 text-purple-700" />
            <span>Sold Consignments</span>
            {soldRows.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-purple-100 text-purple-900 font-extrabold">
                {soldRows.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LIABILITY')}
            className={`h-9 px-4 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'LIABILITY'
                ? 'border-amber-600 text-amber-950 bg-amber-50/70 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FiDollarSign className="w-3.5 h-3.5 text-rose-700" />
            <span>Outstanding Liability</span>
            {filteredLiabilityRows.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 text-rose-900 font-extrabold">
                {filteredLiabilityRows.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETTLEMENTS')}
            className={`h-9 px-4 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'SETTLEMENTS'
                ? 'border-amber-600 text-amber-950 bg-amber-50/70 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>Settlement History</span>
            {settlementRows.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-900 font-extrabold">
                {settlementRows.length}
              </span>
            )}
          </button>
        </div>

        {/* 6. Active Report DataTable Container */}
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {activeTab === 'REGISTER' && (
            <DataTable<ConsignmentInwardRecord>
              data={registerRows}
              columns={registerColumns}
              keyExtractor={(r) => r.id}
              emptyMessage="No consignment memos found for the selected filter."
              onRowClick={(r) => setDrilldownInwardId(r.id)}
            />
          )}

          {activeTab === 'STOCK' && (
            <DataTable<ConsignmentItemRecord>
              data={stockRows}
              columns={stockColumns}
              keyExtractor={(it) => it.id}
              emptyMessage="No vendor-owned items currently in showroom custody."
            />
          )}

          {activeTab === 'SOLD' && (
            <DataTable<ConsignmentItemRecord>
              data={soldRows}
              columns={soldColumns}
              keyExtractor={(it) => it.id}
              emptyMessage="No sold consignment pieces found for the selected period."
            />
          )}

          {activeTab === 'LIABILITY' && (
            <DataTable<ConsignmentInwardRecord>
              data={filteredLiabilityRows}
              columns={liabilityColumns}
              keyExtractor={(r) => r.id}
              emptyMessage="No outstanding vendor liability pending."
              onRowClick={(r) => setDrilldownInwardId(r.id)}
            />
          )}

          {activeTab === 'SETTLEMENTS' && (
            <DataTable<ConsignmentSettlementRecord>
              data={settlementRows}
              columns={settlementColumns}
              keyExtractor={(s) => s.id}
              emptyMessage="No settlement payment records found."
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ConsignmentReportsScreen
