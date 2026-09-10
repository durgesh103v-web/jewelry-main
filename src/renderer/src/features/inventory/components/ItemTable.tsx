import React from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
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
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
        <svg className="animate-spin h-6 w-6 text-amber-600 mb-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs">Loading items...</span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-600">No items found</p>
        <p className="text-xs text-slate-400 mt-1">
          {searchText ? 'Try adjusting your search filters' : 'Click "Add New Item" to create your first item'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider w-10 text-center">
                Sr
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider w-24">
                Code
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider min-w-[200px]">
                Item Name &amp; Badges
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                Metal
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                Group
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                Stamp / Design
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-right">
                Tunch %
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-right">
                Wstg %
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-right">
                Hishob %
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-right">
                Making Rate
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-center">
                GST / HSN
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-center">
                Barcode
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-center">
                Status
              </th>
              <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider text-right w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const isSelected = selectedId === item.id
              const hishob = Number((item.defaultTanch + item.defaultWastage).toFixed(3))

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  onDoubleClick={() => onDoubleClick?.(item)}
                  className={`transition-colors cursor-pointer select-none ${
                    isSelected ? 'bg-amber-50/70 text-slate-900 font-medium' : 'hover:bg-slate-50/80 text-slate-700'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>

                  <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                    {item.itemCode || '-'}
                  </td>

                  <td className="py-2.5 px-3">
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
                  </td>

                  <td className="py-2.5 px-3">{renderMetalBadge(item.metalType)}</td>

                  <td className="py-2.5 px-3 text-slate-700 font-medium">{item.groupName}</td>

                  <td className="py-2.5 px-3 text-slate-500">
                    {item.stampName || item.designName ? (
                      <span>
                        {item.stampName || '-'}{' '}
                        {item.designName ? <span className="text-slate-400">/ {item.designName}</span> : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-medium">
                    {formatOptionalNumber(item.defaultTanch, 2)}%
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-medium">
                    {formatOptionalNumber(item.defaultWastage, 2)}%
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                    {formatOptionalNumber(hishob, 2)}%
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-medium">
                    {item.defaultLabourRate > 0 ? (
                      <span>
                        ₹{formatNumber(item.defaultLabourRate, 2)}{' '}
                        <span className="text-[10px] text-slate-400 font-sans">/{item.labourRateType}</span>
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className="text-slate-600 font-medium">
                      {item.gstRate ?? 3}% {item.gstHsnCode ? <span className="text-slate-400 font-mono text-[10px]">({item.gstHsnCode})</span> : ''}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {item.barcodeItem ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.barcodeType || 'YES'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {item.active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Item"
                        >
                          <FiEdit2 size={13} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Item"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 shrink-0">
        <div>
          Showing <strong>{items.length}</strong> items &middot; Double-click row to edit
        </div>
        <div className="flex items-center gap-3">
          <span>Active: {items.filter((i) => i.active).length}</span>
          <span>Barcoded: {items.filter((i) => i.barcodeItem).length}</span>
        </div>
      </div>
    </div>
  )
}
