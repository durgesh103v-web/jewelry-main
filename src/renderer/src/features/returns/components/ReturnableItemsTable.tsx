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
      <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-xl bg-card/50 text-center">
        <div className="text-3xl mb-2">📦</div>
        <div className="font-semibold text-sm text-foreground">No Items in Invoice</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Please select an original completed invoice above to view returnable items.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto border border-border rounded-xl bg-card shadow-sm flex flex-col">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase text-[11px] border-b border-border sticky top-0 z-10">
          <tr>
            <th className="py-2.5 px-3">#</th>
            <th className="py-2.5 px-3 min-w-[160px]">Item Description</th>
            <th className="py-2.5 px-2 text-center w-20">Sold/Purchased</th>
            <th className="py-2.5 px-2 text-center w-20">Returned</th>
            <th className="py-2.5 px-2 text-center w-20">Available</th>
            <th className="py-2.5 px-2 text-center w-24">Return Pcs</th>
            <th className="py-2.5 px-2 text-right w-24">Return Gross (g)</th>
            <th className="py-2.5 px-2 text-right w-24">Hist. Rate</th>
            <th className="py-2.5 px-3 text-right w-28">Return Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {returnableItems.map((it, idx) => {
            const sel = selectedItems.find((s) => s.originalItemId === it.invoiceItemId)
            const isFullyReturned = it.returnablePcs === 0
            const returnPcs = sel ? sel.returnPcs : 0
            const returnWeight = sel ? sel.grossWeight : 0
            const lineTotal = sel ? sel.calculatedLineTotal : 0

            return (
              <tr
                key={it.invoiceItemId}
                className={`transition-colors ${
                  isFullyReturned
                    ? 'opacity-40 bg-muted/20'
                    : returnPcs > 0
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'hover:bg-muted/30'
                }`}
              >
                <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                  {idx + 1}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>{it.itemName}</span>
                    {isFullyReturned && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-muted text-muted-foreground rounded">
                        Fully Returned
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex gap-2 mt-0.5">
                    <span>{it.metalType}</span>
                    {it.purityName && <span>{it.purityName}</span>}
                    {it.barcode && <span className="font-mono">🏷️ {it.barcode}</span>}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center font-mono">
                  <div>{it.originalPcs} pcs</div>
                  <div className="text-[10px] text-muted-foreground">{it.originalGrossWeight.toFixed(3)}g</div>
                </td>
                <td className="py-2.5 px-2 text-center font-mono text-muted-foreground">
                  <div>{it.returnedPcs} pcs</div>
                  <div className="text-[10px]">{it.returnedGrossWeight.toFixed(3)}g</div>
                </td>
                <td className="py-2.5 px-2 text-center font-mono font-bold text-foreground">
                  <div>{it.returnablePcs} pcs</div>
                  <div className="text-[10px] text-muted-foreground">{it.returnableGrossWeight.toFixed(3)}g</div>
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
                    className="w-14 h-7 text-center bg-background border border-input rounded text-xs focus:ring-1 focus:ring-primary font-mono font-bold"
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
                    className="w-20 h-7 text-right px-1.5 bg-background border border-input rounded text-xs focus:ring-1 focus:ring-primary font-mono"
                  />
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-muted-foreground">
                  ₹{it.goldRate.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-bold font-mono text-primary">
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
