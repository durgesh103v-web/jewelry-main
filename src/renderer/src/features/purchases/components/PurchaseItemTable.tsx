import React from 'react'
import type { PurchaseBillItem } from '../types'

interface PurchaseItemTableProps {
  items: PurchaseBillItem[]
  onUpdateItem: (id: string, updates: Partial<PurchaseBillItem>) => void
  onRemoveItem: (id: string) => void
}

export const PurchaseItemTable: React.FC<PurchaseItemTableProps> = ({
  items,
  onUpdateItem,
  onRemoveItem
}) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 rounded-xl bg-white/60 text-center">
        <div className="text-3xl mb-2">📥</div>
        <div className="font-semibold text-sm text-slate-800">No Items in Purchase Bill</div>
        <p className="text-xs text-slate-500 mt-1 max-w-sm flex items-center justify-center gap-1.5 flex-wrap">
          <span>Scan a barcode or press</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px] text-slate-700 font-bold">
            F4
          </kbd>
          <span>to search and add jewellery items to inward.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs flex flex-col">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200 sticky top-0 z-10">
          <tr>
            <th className="py-2.5 px-3">#</th>
            <th className="py-2.5 px-3 min-w-[160px]">Item / Description</th>
            <th className="py-2.5 px-2 text-center w-16">Pcs</th>
            <th className="py-2.5 px-2 text-right w-24">Gross (g)</th>
            <th className="py-2.5 px-2 text-right w-20">Less (g)</th>
            <th className="py-2.5 px-2 text-right w-24">Net (g)</th>
            <th className="py-2.5 px-2 text-center w-20">Tunch%</th>
            <th className="py-2.5 px-2 text-right w-24">Cost Rate (₹/g)</th>
            <th className="py-2.5 px-2 text-right w-24">Making (₹)</th>
            <th className="py-2.5 px-3 text-right w-28">Purchase Amount</th>
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
              <tr key={it.id} className="hover:bg-slate-50/70 transition-colors group">
                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                  {idx + 1}
                </td>
                <td className="py-2 px-3">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{it.itemName}</span>
                    {isItemCalc && (
                      <span className="text-[10px] text-amber-500 animate-spin">⏳</span>
                    )}
                    {isItemErr && (
                      <span className="text-[10px] px-1 bg-rose-50 text-rose-600 rounded border border-rose-200" title={it.pricingError}>
                        ⚠️ Error
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex gap-2 mt-0.5">
                    {it.barcode && <span className="font-mono">🏷️ {it.barcode}</span>}
                    <span>{it.metalType}</span>
                    {it.purityName && <span>{it.purityName}</span>}
                  </div>
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="number"
                    min="1"
                    value={it.pcs}
                    onChange={(e) => onUpdateItem(it.id, { pcs: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-12 h-7 text-center bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-800"
                  />
                </td>
                <td className="py-2 px-2 text-right">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={it.grossWeight}
                    onChange={(e) => onUpdateItem(it.id, { grossWeight: Math.max(0.001, Number(e.target.value) || 0) })}
                    className="w-20 h-7 text-right px-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono font-medium text-slate-800"
                  />
                </td>
                <td className="py-2 px-2 text-right">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={it.lessWeight || 0}
                    onChange={(e) => onUpdateItem(it.id, { lessWeight: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-16 h-7 text-right px-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-500"
                  />
                </td>
                <td className="py-2 px-2 text-right font-mono font-semibold text-slate-800">
                  {netWeight.toFixed(3)}
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={it.tunch ?? 100}
                    onChange={(e) => onUpdateItem(it.id, { tunch: Math.min(100, Math.max(0, Number(e.target.value) || 100)) })}
                    className="w-14 h-7 text-center bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-800"
                  />
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-500">
                  ₹{(p?.metal.ratePerGram || it.goldRate || 0).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-500">
                  ₹{making.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right font-bold text-amber-700 font-mono">
                  {isItemCalc ? (
                    <span className="animate-pulse text-slate-400">...</span>
                  ) : isItemErr ? (
                    <span className="text-rose-600 text-xs">Error</span>
                  ) : (
                    `₹${lineTotal.toLocaleString()}`
                  )}
                </td>
                <td className="py-2 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(it.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 text-sm transition-opacity cursor-pointer"
                    title="Remove Item"
                  >
                    🗑️
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
