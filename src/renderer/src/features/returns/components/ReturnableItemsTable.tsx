import React from 'react'
import type { ReturnableInvoiceItem } from '@shared/types/returnTransaction'
import type { SelectedReturnItem } from '../types'

interface ReturnableItemsTableProps {
  returnableItems: ReturnableInvoiceItem[]
  selectedItems: SelectedReturnItem[]
  onSetItemQuantity: (item: ReturnableInvoiceItem, pcs: number, grossWeight?: number) => void
}

export const ReturnableItemsTable: React.FC<ReturnableItemsTableProps> = ({
  returnableItems,
  selectedItems,
  onSetItemQuantity
}) => {
  if (returnableItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-slate-300 rounded-xl bg-white/60 text-center min-h-[200px]">
        <div className="text-3xl mb-2">📦</div>
        <div className="font-semibold text-sm text-slate-800">No Items in Invoice</div>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Please select an original completed invoice above to view returnable items.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col min-h-0">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
            <th className="py-2.5 px-3">#</th>
            <th className="py-2.5 px-3 min-w-[160px]">Item Description</th>
            <th className="py-2.5 px-2 text-center w-20">Sold</th>
            <th className="py-2.5 px-2 text-center w-20">Returned</th>
            <th className="py-2.5 px-2 text-center w-20">Available</th>
            <th className="py-2.5 px-2 text-center w-24">Return Pcs</th>
            <th className="py-2.5 px-2 text-right w-24">Gross (g)</th>
            <th className="py-2.5 px-2 text-right w-24">Rate</th>
            <th className="py-2.5 px-3 text-right w-28">Credit</th>
          </tr>
        </thead>
        <tbody>
          {returnableItems.map((it, idx) => {
            const sel = selectedItems.find((s) => s.originalItemId === it.invoiceItemId)
            const isFullyReturned = it.returnablePcs === 0
            const returnPcs = sel ? sel.returnPcs : 0
            const returnWeight = sel ? sel.grossWeight : 0
            const lineTotal = sel ? sel.calculatedLineTotal : 0

            return (
              <tr
                key={it.invoiceItemId}
                className={`border-b border-slate-100 last:border-none transition-colors ${
                  isFullyReturned
                    ? 'opacity-40 bg-slate-50/60'
                    : returnPcs > 0
                    ? 'bg-amber-50/60 hover:bg-amber-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{it.itemName}</span>
                    {isFullyReturned && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">
                        Fully Returned
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex gap-2 mt-0.5">
                    <span>{it.metalType}</span>
                    {it.purityName && <span>{it.purityName}</span>}
                    {it.barcode && <span className="font-mono">🏷️ {it.barcode}</span>}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center font-mono">
                  <div className="font-semibold text-slate-700">{it.originalPcs} pcs</div>
                  <div className="text-[10px] text-slate-400">{it.originalGrossWeight.toFixed(3)}g</div>
                </td>
                <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                  <div>{it.returnedPcs} pcs</div>
                  <div className="text-[10px]">{it.returnedGrossWeight.toFixed(3)}g</div>
                </td>
                <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                  <div>{it.returnablePcs} pcs</div>
                  <div className="text-[10px] text-slate-400">{it.returnableGrossWeight.toFixed(3)}g</div>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <input
                    type="number"
                    min="0"
                    max={it.returnablePcs}
                    value={returnPcs}
                    disabled={isFullyReturned}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(it.returnablePcs, Number(e.target.value) || 0))
                      onSetItemQuantity(it, val)
                    }}
                    className="w-14 h-7 text-center bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2.5 px-2 text-right">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max={it.returnableGrossWeight}
                    value={returnWeight}
                    disabled={isFullyReturned || returnPcs === 0}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(it.returnableGrossWeight, Number(e.target.value) || 0))
                      onSetItemQuantity(it, returnPcs, val)
                    }}
                    className="w-20 h-7 text-right px-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                  ₹{it.goldRate.toLocaleString()}
                </td>
                <td className={`py-2.5 px-3 text-right font-bold font-mono ${returnPcs > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  ₹{lineTotal.toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
