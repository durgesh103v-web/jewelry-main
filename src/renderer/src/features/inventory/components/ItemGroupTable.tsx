import React from 'react'
import { FiEdit2, FiTrash2, FiLayers } from 'react-icons/fi'

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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        GOLD
      </span>
    )
  }

  if (normalized === 'silver') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        SILVER
      </span>
    )
  }

  if (normalized === 'platinum') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
        PLATINUM
      </span>
    )
  }

  if (normalized === 'diamond') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
        DIAMOND
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
      {metal.toUpperCase()}
    </span>
  )
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
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Loading item groups...</span>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
          <FiLayers size={22} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-700">No Item Groups Found</h4>
          <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
            {searchText
              ? `No item groups match your search "${searchText}". Try adjusting your filters.`
              : 'Start by creating your first jewellery item group or category.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto select-none">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 shadow-xs">
          <tr>
            <th className="py-2.5 px-3 w-12 text-center font-bold">#</th>
            <th className="py-2.5 px-3 w-24">Code</th>
            <th className="py-2.5 px-4 min-w-[200px]">Group Name</th>
            <th className="py-2.5 px-3 w-28">Metal Type</th>
            <th className="py-2.5 px-3 w-32">HSN / GST</th>
            <th className="py-2.5 px-3 w-32">Default Purity</th>
            <th className="py-2.5 px-3 w-36">Making (Labour)</th>
            <th className="py-2.5 px-3 w-24">Wastage %</th>
            <th className="py-2.5 px-4">Description</th>
            <th className="py-2.5 px-3 w-24 text-center">Status</th>
            <th className="py-2.5 px-3 w-24 text-right no-print">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white font-normal text-slate-700">
          {groups.map((group, index) => {
            const isSelected = selectedId === group.id

            return (
              <tr
                key={group.id}
                onClick={() => onSelect(group.id)}
                onDoubleClick={() => onDoubleClick?.(group)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-50/70 border-l-4 border-l-amber-500 font-medium'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Sr No */}
                <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                  {index + 1}
                </td>

                {/* Code / Prefix */}
                <td className="py-2.5 px-3">
                  {group.prefix ? (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                      {group.prefix}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-mono text-xs">-</span>
                  )}
                </td>

                {/* Group Name */}
                <td className="py-2.5 px-4">
                  <div className="font-bold text-slate-900 leading-tight">{group.groupName}</div>
                </td>

                {/* Metal Type Badge */}
                <td className="py-2.5 px-3">{renderMetalBadge(group.metalType)}</td>

                {/* HSN & GST */}
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">{group.hsnCode || '7113'}</span>{' '}
                  <span className="text-slate-400">({group.gstRate ?? 3.0}%)</span>
                </td>

                {/* Default Purity */}
                <td className="py-2.5 px-3">
                  {group.defaultPurity ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                      {group.defaultPurity}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">-</span>
                  )}
                </td>

                {/* Default Making (Labour) */}
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                  {group.defaultLabourRate && group.defaultLabourRate > 0 ? (
                    <span>
                      ₹{group.defaultLabourRate}
                      <span className="text-[10px] text-slate-400 ml-1">
                        {group.defaultLabourType === 'PER_PIECE'
                          ? '/pc'
                          : group.defaultLabourType === 'PERCENT'
                            ? '%'
                            : '/gm'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                {/* Default Wastage */}
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                  {group.defaultWastage && group.defaultWastage > 0 ? (
                    <span>{group.defaultWastage}%</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                {/* Description */}
                <td className="py-2.5 px-4 text-slate-500 truncate max-w-[200px]" title={group.description}>
                  {group.description || <span className="text-slate-300">-</span>}
                </td>

                {/* Status */}
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      group.active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {group.active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-right no-print">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit?.(group)
                      }}
                      className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                      title="Edit Item Group"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete?.(group)
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Item Group"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
