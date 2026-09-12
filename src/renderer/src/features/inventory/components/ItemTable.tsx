import React from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { DataTable, Column } from '@components/ui'
import { formatNumber } from '@utils/formatters'

export interface ItemRecord {
  id: string
  itemCode: string
  itemName: string
  metalType: string
  itemGroupId: string
  groupName: string
  defaultStampId: string
  stampName: string
  defaultDesignId: string
  designName: string
  purityKarat: string
  isStudded: boolean
  stoneDeductionType: string
  huidRequired: boolean
  minStockQty: number
  minStockWeight: number
  description: string
  barcodeItem: boolean
  barcodeType: string
  barcodeValue?: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  gstRate: number
  fixedWeightPerPcs: number
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  active: boolean
}

export interface ItemTableProps {
  items: ItemRecord[]
  loading: boolean
  searchText: string
  selectedId?: string
  onSelect: (id: string) => void
  onDoubleClick?: (item: ItemRecord) => void
  onEdit?: (item: ItemRecord) => void
  onDelete?: (item: ItemRecord) => void
}

function renderMetalBadge(metal: string): React.JSX.Element {
  const normalized = (metal || '').toLowerCase()

  if (normalized === 'gold') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
        Gold
      </span>
    )
  }

  if (normalized === 'silver') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">
        Silver
      </span>
    )
  }

  if (normalized === 'platinum') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 whitespace-nowrap">
        Platinum
      </span>
    )
  }

  if (normalized === 'diamond') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 whitespace-nowrap">
        Diamond
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
      {metal}
    </span>
  )
}

function formatOptionalNumber(value: number, decimals = 2): string {
  if (!value || isNaN(value)) return '-'
  return formatNumber(value, decimals)
}

export function ItemTable({
  items,
  loading,
  searchText,
  selectedId,
  onSelect,
  onDoubleClick,
  onEdit,
  onDelete
}: ItemTableProps): React.JSX.Element {
  const columns: Column<ItemRecord>[] = [
    {
      key: 'sr',
      header: 'Sr No',
      align: 'center',
      width: '68px',
      minWidth: '68px',
      render: (_, i) => (
        <span className="inline-block min-w-[22px] text-center font-semibold text-[11px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded">
          {i + 1}
        </span>
      )
    },
    {
      key: 'itemCode',
      header: 'Code',
      width: '90px',
      render: (item) => <span className="font-mono font-bold text-amber-700">{item.itemCode || '-'}</span>
    },
    {
      key: 'itemName',
      header: 'Item Name & Badges',
      minWidth: '200px',
      render: (item) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-900">{item.itemName}</span>
          {item.purityKarat && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">
              {item.purityKarat}
            </span>
          )}
          {item.isStudded && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
              Studded
            </span>
          )}
          {item.huidRequired && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold border border-sky-200">
              HUID
            </span>
          )}
        </div>
      )
    },
    {
      key: 'metalType',
      header: 'Metal',
      width: '90px',
      render: (item) => renderMetalBadge(item.metalType)
    },
    {
      key: 'groupName',
      header: 'Group',
      minWidth: '110px',
      render: (item) => (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 bg-slate-100/70 border border-slate-200/60 whitespace-nowrap">
          {item.groupName || '-'}
        </span>
      )
    },
    {
      key: 'stampDesign',
      header: 'Stamp / Design',
      minWidth: '120px',
      render: (item) =>
        item.stampName || item.designName ? (
          <span className="text-slate-700 font-medium text-[11px]">
            {item.stampName || '-'}
            {item.designName ? <span className="text-slate-400"> / {item.designName}</span> : ''}
          </span>
        ) : (
          <span className="text-slate-300">-</span>
        )
    },
    {
      key: 'defaultTanch',
      header: 'Tunch %',
      align: 'right',
      width: '75px',
      render: (item) => (
        <span className="font-mono text-slate-800 font-medium">{formatOptionalNumber(item.defaultTanch, 2)}%</span>
      )
    },
    {
      key: 'defaultWastage',
      header: 'Wstg %',
      align: 'right',
      width: '75px',
      render: (item) => (
        <span className="font-mono text-slate-800 font-medium">{formatOptionalNumber(item.defaultWastage, 2)}%</span>
      )
    },
    {
      key: 'hishob',
      header: 'Hishob %',
      align: 'right',
      width: '80px',
      render: (item) => {
        const hishob = Number((item.defaultTanch + item.defaultWastage).toFixed(3))
        return <span className="font-mono font-bold text-amber-900">{formatOptionalNumber(hishob, 2)}%</span>
      }
    },
    {
      key: 'makingRate',
      header: 'Making Rate',
      align: 'right',
      minWidth: '110px',
      render: (item) =>
        item.defaultLabourRate > 0 ? (
          <span className="font-mono text-slate-800 font-medium">
            ₹{formatNumber(item.defaultLabourRate, 2)}{' '}
            <span className="text-[10px] text-slate-400 font-sans">/{item.labourRateType}</span>
          </span>
        ) : (
          <span className="text-slate-300 font-mono">-</span>
        )
    },
    {
      key: 'gstHsn',
      header: 'GST / HSN',
      align: 'center',
      minWidth: '100px',
      render: (item) => (
        <span className="text-slate-600 font-medium">
          {item.gstRate ?? 3}%{' '}
          {item.gstHsnCode ? <span className="text-slate-400 font-mono text-[10px]">({item.gstHsnCode})</span> : ''}
        </span>
      )
    },
    {
      key: 'barcodeItem',
      header: 'Barcode',
      align: 'center',
      width: '80px',
      render: (item) =>
        item.barcodeItem ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {item.barcodeType || 'YES'}
          </span>
        ) : (
          <span className="text-slate-400 text-[11px]">-</span>
        )
    },
    {
      key: 'active',
      header: 'Status',
      align: 'center',
      width: '90px',
      render: (item) =>
        item.active ? (
          <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">Active</span>
        ) : (
          <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Inactive</span>
        )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '80px',
      headerClassName: 'no-print',
      className: 'no-print',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(item)
              }}
              className="p-1.5 rounded-md text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-all"
              title="Edit Item"
            >
              <FiEdit2 size={16} className="stroke-[2.2]" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item)
              }}
              className="p-1.5 rounded-md text-rose-500 hover:text-rose-800 hover:bg-rose-100 transition-all"
              title="Delete Item"
            >
              <FiTrash2 size={16} className="stroke-[2.2]" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      keyExtractor={(r) => r.id}
      loading={loading}
      loadingMessage="Loading items..."
      searchText={searchText}
      emptyTitle="No items found."
      emptyActionText="Add New Item"
      selectedId={selectedId}
      onSelect={(id) => onSelect(String(id))}
      onDoubleClick={(r) => onDoubleClick?.(r)}
      printTitle="ITEM MASTER DIRECTORY"
    />
  )
}
