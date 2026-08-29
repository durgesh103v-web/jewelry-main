import React, { useState, useEffect } from 'react'
import type { CustomerOrderRecord } from '../../../../../shared/types/customerOrder'

interface OrderSelectorProps {
  customerId?: string
  currentOrder: CustomerOrderRecord | null
  onSelectOrder: (orderId: string) => void
  onClearOrder: () => void
}

export const OrderSelector: React.FC<OrderSelectorProps> = ({
  customerId,
  currentOrder,
  onSelectOrder,
  onClearOrder
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let active = true
    setIsLoading(true)

    const fetchOrders = async () => {
      try {
        const filter = customerId ? { customerId } : undefined
        const list = await window.api.orders.list(filter)
        if (active) {
          const eligible = (list || []).filter(
            (o) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
          )
          setOrders(eligible)
        }
      } catch (err) {
        console.error('Failed to load orders:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    fetchOrders()
    return () => {
      active = false
    }
  }, [isOpen, customerId])

  if (currentOrder) {
    return (
      <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">📦 Order: {currentOrder.orderNumber}</span>
          <span className="text-muted-foreground">({currentOrder.orderDate})</span>
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            ₹{currentOrder.grandTotal.toLocaleString()}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearOrder}
          className="text-muted-foreground hover:text-destructive transition-colors font-medium"
        >
          Detach Order
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs px-3 py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-lg border border-border flex items-center gap-1.5 transition-colors"
      >
        <span>📋</span>
        <span>Import From Customer Order</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span>📋</span>
                <span>Select Customer Order to Bill</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No active/confirmed orders found for billing.
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        onSelectOrder(o.id)
                        setIsOpen(false)
                      }}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/40 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm text-foreground flex items-center gap-2">
                          <span>{o.orderNumber}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {o.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                          <span>Date: {o.orderDate}</span>
                          {o.customerName && <span>Customer: {o.customerName}</span>}
                          <span>Items: {o.totalPcs} pcs ({o.totalGrossWeight.toFixed(3)}g)</span>
                        </div>
                      </div>
                      <div className="text-right font-bold text-sm text-primary">
                        ₹{o.grandTotal.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-muted/40 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
