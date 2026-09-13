import React from 'react'
import type { PosBillItem } from '../types'
import { FiTrash2, FiAward } from 'react-icons/fi'

interface SalesItemTableProps {
  items: PosBillItem[]
  onUpdateItem: (id: string, updates: Partial<PosBillItem>) => void
  onRemoveItem: (id: string) => void
  isCalculating?: boolean
  onOpenSearch?: () => void
  onQuickAddItem?: (barcode: string) => void
}

const SAMPLE_QUICK_ITEMS = [
  { label: '✨ 22K Royal Bridal Necklace', tag: 'TAG-G101', wt: '24.850g' },
  { label: '✨ 22K Filigree Bangles', tag: 'TAG-G102', wt: '32.400g' },
  { label: '✨ 22K Daily Wear Chain', tag: 'TAG-G103', wt: '8.500g' },
  { label: '💎 18K Solitaire Ring', tag: 'TAG-D201', wt: '4.800g' },
  { label: '🪙 925 Silver Payal', tag: 'TAG-S301', wt: '85.000g' }
]

export const SalesItemTable: React.FC<SalesItemTableProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onOpenSearch,
  onQuickAddItem
}) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-slate-300 rounded-xl bg-white shadow-2xs text-center select-none min-h-[260px]">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mb-3 shadow-2xs">
          💎
        </div>
        <div className="font-extrabold text-sm text-slate-900">No Items on Active Invoice</div>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Scan a barcode tag or{' '}
          <button
            type="button"
            onClick={onOpenSearch}
            className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
          >
            press F4 to search inventory
          </button>
          .
        </p>

        {/* 1-Click Quick Add Samples */}
        {onQuickAddItem && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ⚡ 1-Click Quick Add Sample Jewellery
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-xl">
              {SAMPLE_QUICK_ITEMS.map((sample) => (
                <button
                  key={sample.tag}
                  type="button"
                  onClick={() => onQuickAddItem(sample.tag)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-xs font-medium transition-all shadow-2xs cursor-pointer"
                  title={`Add ${sample.label} (${sample.tag})`}
                >
                  <span className="font-semibold">{sample.label}</span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">({sample.wt})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs flex flex-col select-none">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200 sticky top-0 z-10 tracking-tight">
          <tr>
            <th className="py-2.5 px-3 w-10 text-center text-slate-500">#</th>
            <th className="py-2.5 px-3 min-w-[200px]">Item Description & HUID</th>
            <th className="py-2.5 px-2 text-center w-14">Pcs</th>
            <th className="py-2.5 px-2 text-right w-28 text-amber-900 font-bold">Gross Wt (g)</th>
            <th className="py-2.5 px-2 text-right w-20">Less (g)</th>
            <th className="py-2.5 px-2 text-right w-22 font-extrabold text-slate-900">Net (g)</th>
            <th className="py-2.5 px-2 text-center w-18">Tunch%</th>
            <th className="py-2.5 px-2 text-right w-22">Rate (₹/g)</th>
            <th className="py-2.5 px-2 text-right w-22">Making (₹)</th>
            <th className="py-2.5 px-2 text-right w-20 text-rose-700">Disc (₹)</th>
            <th className="py-2.5 px-3 text-right w-28 text-amber-900 font-extrabold">Line Total</th>
            <th className="py-2.5 px-2 text-center w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((it, idx) => {
            const p = it.pricingResult
            const isItemCalc = it.pricingStatus === 'CALCULATING'
            const isItemErr = it.pricingStatus === 'ERROR'
            const netWeight = p ? p.weights.netWeight : Math.max(0, it.grossWeight - (it.lessWeight || 0))
            const lineTotal = p ? p.total.finalAmount : 0
            const making = p ? p.charges.making : 0

            return (
              <tr key={it.id} className="hover:bg-amber-50/30 transition-colors group">
                <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] text-center font-bold">
                  {idx + 1}
                </td>

                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{it.itemName}</span>
                    {isItemCalc && (
                      <span className="text-[10px] text-amber-600 animate-spin">⏳</span>
                    )}
                    {isItemErr && (
                      <span className="text-[10px] px-1 bg-rose-100 text-rose-700 rounded font-semibold" title={it.pricingError}>
                        ⚠️ Error
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                    {it.barcode && (
                      <span className="font-mono bg-slate-100 px-1 rounded text-[10px] text-slate-700 font-medium">
                        🏷️ {it.barcode}
                      </span>
                    )}

                    <span className="font-semibold text-slate-600">{it.metalType}</span>
                    {it.purityName && <span className="text-slate-500">({it.purityName})</span>}

                    {/* HUID Badge / Input */}
                    <div className="flex items-center gap-1 ml-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                      <FiAward size={11} className="text-amber-700" />
                      <span className="font-bold text-amber-800">HUID:</span>
                      <input
                        type="text"
                        value={it.huid || ''}
                        onChange={(e) => onUpdateItem(it.id, { huid: e.target.value.toUpperCase() })}
                        placeholder="6-Digit"
                        className="w-16 h-4 bg-transparent text-[10px] font-mono font-bold text-amber-900 uppercase focus:outline-none focus:bg-white rounded px-0.5"
                      />
                    </div>

                    {/* Diamond / Stone Details if present */}
                    {(Boolean(it.diamondCarats) || Boolean(it.stoneAmount)) && (
                      <span className="text-[10px] text-cyan-800 font-semibold bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                        💎 {it.diamondCarats ? `${it.diamondCarats} Cts` : ''} {it.stoneAmount ? `St: ₹${it.stoneAmount}` : ''}
                      </span>
                    )}
                  </div>
                </td>

                {/* Pcs */}
                <td className="py-2.5 px-2 text-center">
                  <input
                    type="number"
                    min="1"
                    value={it.pcs}
                    onChange={(e) => onUpdateItem(it.id, { pcs: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-12 h-7 text-center bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:border-amber-500 font-mono font-semibold"
                  />
                </td>

                {/* Gross Weight */}
                <td className="py-2.5 px-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={it.grossWeight}
                      onChange={(e) => onUpdateItem(it.id, { grossWeight: Math.max(0.001, Number(e.target.value) || 0) })}
                      className="w-20 h-7 text-right px-1.5 bg-amber-50/60 border border-amber-300 rounded text-xs focus:bg-white focus:border-amber-500 font-mono font-bold text-slate-900"
                    />
                  </div>
                </td>

                {/* Less Weight */}
                <td className="py-2.5 px-2 text-right">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={it.lessWeight || 0}
                    onChange={(e) => onUpdateItem(it.id, { lessWeight: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-16 h-7 text-right px-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:border-amber-500 font-mono text-slate-600 font-medium"
                  />
                </td>

                {/* Net Weight */}
                <td className="py-2.5 px-2 text-right font-mono font-extrabold text-slate-900">
                  {netWeight.toFixed(3)}
                </td>

                {/* Tunch % */}
                <td className="py-2.5 px-2 text-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={it.tunch ?? 100}
                    onChange={(e) => onUpdateItem(it.id, { tunch: Math.min(100, Math.max(0, Number(e.target.value) || 100)) })}
                    className="w-14 h-7 text-center bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:border-amber-500 font-mono font-semibold"
                  />
                </td>

                {/* Rate */}
                <td className="py-2.5 px-2 text-right font-mono text-slate-600 font-medium">
                  ₹{(p?.metal.ratePerGram || it.goldRate || 0).toLocaleString()}
                </td>

                {/* Making */}
                <td className="py-2.5 px-2 text-right font-mono text-slate-700 font-semibold">
                  ₹{making.toLocaleString()}
                </td>

                {/* Making / Item Discount */}
                <td className="py-2.5 px-2 text-right">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={it.makingDiscount || it.discountAmount || 0}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0)
                      onUpdateItem(it.id, { makingDiscount: val, discountAmount: val })
                    }}
                    placeholder="0"
                    className="w-16 h-7 text-right px-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:border-rose-400 font-mono font-bold text-rose-700"
                  />
                </td>

                {/* Line Total */}
                <td className="py-2.5 px-3 text-right font-bold text-amber-900 font-mono text-sm">
                  {isItemCalc ? (
                    <span className="animate-pulse text-slate-400 text-xs">...</span>
                  ) : isItemErr ? (
                    <span className="text-rose-600 text-xs">Error</span>
                  ) : (
                    `₹${lineTotal.toLocaleString()}`
                  )}
                </td>

                {/* Delete */}
                <td className="py-2.5 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(it.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove Item"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
