import React, { useState, useEffect, useCallback } from 'react'

export interface MetalRateItem {
  metal: string
  purity: string
  rate: number
  change?: number
  changePercent?: string
}

export interface MetalRatesStripProps {
  onOpenSettings?: () => void
  className?: string
  compact?: boolean
}

export const MetalRatesStrip: React.FC<MetalRatesStripProps> = ({
  onOpenSettings,
  className = '',
  compact = false
}) => {
  const [rates, setRates] = useState<MetalRateItem[]>([
    { metal: 'Gold', purity: '24K', rate: 7420, change: 15, changePercent: '+0.2%' },
    { metal: 'Gold', purity: '22K', rate: 6800, change: 12, changePercent: '+0.18%' },
    { metal: 'Gold', purity: '18K', rate: 5565, change: 10, changePercent: '+0.18%' },
    { metal: 'Silver', purity: 'Fine 999', rate: 92.5, change: -0.3, changePercent: '-0.32%' }
  ])
  const [lastUpdated, setLastUpdated] = useState<string>('Live')

  const fetchRates = useCallback(async () => {
    try {
      if (window.api?.goldRates?.list) {
        const list = await window.api.goldRates.list()
        if (Array.isArray(list) && list.length > 0) {
          const mapped: MetalRateItem[] = list.map((r: any) => ({
            metal: r.metalType || 'Gold',
            purity: r.purityName || (r.metalType === 'Silver' ? '999' : '22K'),
            rate: Number(r.rate || r.ratePerGram || 0),
            change: Number(r.change || 0),
            changePercent: r.changePercent || ''
          }))
          setRates(mapped)
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        }
      }
    } catch {
      // Keep defaults gracefully
    }
  }, [])

  useEffect(() => {
    void fetchRates()
    const interval = setInterval(() => {
      void fetchRates()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchRates])

  return (
    <div
      className={`metal-rates-strip flex items-center justify-between gap-3 bg-amber-50/70 border border-amber-200/80 rounded-xl px-4 py-2 ${className}`.trim()}
      style={{
        background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)',
        border: '1px solid #fde68a'
      }}
    >
      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs shrink-0">
        <svg className="w-4 h-4 text-amber-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="#f59e0b" fillOpacity="0.25" />
          <circle cx="10" cy="10" r="4" fill="#d97706" />
        </svg>
        <span>LIVE SHOWROOM RATES</span>
        <span className="text-[10px] font-normal text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded">
          {lastUpdated}
        </span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto py-0.5">
        {rates.map((item, idx) => {
          const isUp = (item.change ?? 0) >= 0
          return (
            <div
              key={`${item.metal}-${item.purity}-${idx}`}
              className="flex items-center gap-2 bg-white/90 border border-amber-200/90 rounded-lg px-2.5 py-1 text-xs shadow-xs"
            >
              <span className="font-semibold text-slate-700">{item.metal} {item.purity}:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{item.rate.toLocaleString('en-IN')}/g
              </span>
              {item.changePercent && (
                <span
                  className={`text-[10px] font-bold ${
                    isUp ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isUp ? '▲' : '▼'} {item.changePercent}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {onOpenSettings && !compact && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full px-3 py-1 transition-colors shrink-0"
        >
          Update Rates
        </button>
      )}
    </div>
  )
}
