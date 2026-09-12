import React from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { DataTable, Column } from '@components/ui'

export interface ItemGroupRecord {
  id: string
  groupName: string
  metalType: string
  description: string
  active: boolean
  prefix?: string
  hsnCode?: string
  gstRate?: number
  defaultPurity?: string
  defaultLabourRate?: number
  defaultLabourType?: string
  defaultWastage?: number
}

export interface ItemGroupTableProps {
  groups: ItemGroupRecord[]
  loading: boolean
  searchText: string
  selectedId?: string | null
  onSelect: (id: string) => void
  onDoubleClick?: (group: ItemGroupRecord) => void
  onEdit?: (group: ItemGroupRecord) => void
  onDelete?: (group: ItemGroupRecord) => void
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

function renderStatus(active: boolean): React.JSX.Element {
  if (active) {
    return <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">Active</span>
  }

  return <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Inactive</span>
}

export function ItemGroupTable({
  groups,
  loading,
  searchText,
  selectedId,
  onSelect,
  onDoubleClick,
  onEdit,
  onDelete
}: ItemGroupTableProps): React.JSX.Element {
  const columns: Column<ItemGroupRecord>[] = [
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
      key: 'prefix',
      header: 'Code',
      width: '90px',
      render: (r) =>
        r.prefix ? (
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
            {r.prefix}
          </span>
        ) : (
          <span className="text-slate-300 font-mono text-xs">-</span>
        )
    },
    {
      key: 'groupName',
      header: 'Group Name',
      minWidth: '200px',
      render: (r) => <div className="font-semibold text-slate-900">{r.groupName}</div>
    },
    {
      key: 'metalType',
      header: 'Metal Type',
      minWidth: '120px',
      render: (r) => renderMetalBadge(r.metalType)
    },
    {
      key: 'hsnCode',
      header: 'HSN / GST',
      minWidth: '130px',
      render: (r) => (
        <span className="font-mono text-[11px] text-slate-600">
          <span className="font-semibold text-slate-800">{r.hsnCode || '7113'}</span>{' '}
          <span className="text-slate-400">({r.gstRate ?? 3.0}%)</span>
        </span>
      )
    },
    {
      key: 'defaultPurity',
      header: 'Default Purity',
      minWidth: '130px',
      render: (r) =>
        r.defaultPurity ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            {r.defaultPurity}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">-</span>
        )
    },
    {
      key: 'defaultLabourRate',
      header: 'Making (Labour)',
      minWidth: '140px',
      render: (r) =>
        r.defaultLabourRate && r.defaultLabourRate > 0 ? (
          <span className="font-mono text-[11px] text-slate-600">
            ₹{r.defaultLabourRate}
            <span className="text-[10px] text-slate-400 ml-1">
              {r.defaultLabourType === 'PER_PIECE' ? '/pc' : r.defaultLabourType === 'PERCENT' ? '%' : '/gm'}
            </span>
          </span>
        ) : (
          <span className="text-slate-300 font-mono text-xs">-</span>
        )
    },
    {
      key: 'defaultWastage',
      header: 'Wastage %',
      align: 'right',
      minWidth: '100px',
      render: (r) =>
        r.defaultWastage && r.defaultWastage > 0 ? (
          <span className="font-mono text-[11px] text-slate-600">{r.defaultWastage}%</span>
        ) : (
          <span className="text-slate-300 font-mono text-xs">-</span>
        )
    },
    {
      key: 'description',
      header: 'Description',
      minWidth: '180px',
      render: (r) => (
        <span className="text-slate-600 line-clamp-1">{r.description || <span className="text-slate-300 font-mono">-</span>}</span>
      )
    },
    {
      key: 'active',
      header: 'Status',
      align: 'center',
      width: '100px',
      render: (r) => renderStatus(r.active)
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '90px',
      headerClassName: 'no-print',
      className: 'no-print',
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(r)
            }}
            className="p-1.5 rounded-md text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-all"
            title="Edit Item Group"
          >
            <FiEdit2 size={16} className="stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(r)
            }}
            className="p-1.5 rounded-md text-rose-500 hover:text-rose-800 hover:bg-rose-100 transition-all"
            title="Delete Item Group"
          >
            <FiTrash2 size={16} className="stroke-[2.2]" />
          </button>
        </div>
      )
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={groups}
      keyExtractor={(r) => r.id}
      loading={loading}
      loadingMessage="Loading item groups..."
      searchText={searchText}
      emptyTitle="No item groups found."
      emptyActionText="Add New Group"
      selectedId={selectedId}
      onSelect={(id) => onSelect(String(id))}
      onDoubleClick={(r) => onDoubleClick?.(r)}
      printTitle="ITEM GROUP DIRECTORY"
    />
  )
}
