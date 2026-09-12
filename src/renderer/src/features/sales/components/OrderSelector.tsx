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
      <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-900">📦 Order: {currentOrder.orderNumber}</span>
          <span className="text-slate-500">({currentOrder.orderDate})</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
            ₹{currentOrder.grandTotal.toLocaleString()}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearOrder}
          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors font-semibold cursor-pointer"
        >
          Detach
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full text-xs px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-colors font-semibold cursor-pointer shadow-2xs"
      >
        <span>📋</span>
        <span>Import From Customer Order</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>📋</span>
                <span>Select Customer Order to Bill</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No active pending orders for this customer.
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
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {o.orderNumber}
                          <span className="ml-2 font-normal text-slate-500">({o.orderDate})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Delivery Due: {o.deliveryDate || 'N/A'} • Items: {o.items?.length || 1}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-xs text-amber-900">
                          ₹{o.grandTotal.toLocaleString()}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">
                          {o.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-md font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
