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
          // Deduplicate rates by metal and normalized purity
          const seen = new Set<string>()
          const uniqueRates: MetalRateItem[] = []
          for (const r of list) {
            const metal = r.metalType || 'Gold'
            const rawPurity = r.purityName || (metal === 'Silver' ? '999' : '22K')
            const normKey = `${metal.toLowerCase()}_${rawPurity.toLowerCase().replace(/karat/i, 'k').replace(/\s+/g, '')}`
            if (!seen.has(normKey)) {
              seen.add(normKey)
              uniqueRates.push({
                metal,
                purity: rawPurity,
                rate: Number(r.rate || r.ratePerGram || 0),
                change: Number(r.change || 0),
                changePercent: r.changePercent || ''
              })
            }
          }
          setRates(uniqueRates)
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
      className={`metal-rates-strip flex items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-xl px-4 py-2 shadow-2xs ${className}`.trim()}
    >
      <div className="flex items-center gap-2 text-slate-700 font-bold text-xs shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="tracking-wide text-slate-800 uppercase font-bold text-[11px]">
          Live Showroom Rates
        </span>
        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          {lastUpdated}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-0.5">
        {rates.map((item, idx) => {
          const isUp = (item.change ?? 0) >= 0
          return (
            <div
              key={`${item.metal}-${item.purity}-${idx}`}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs shadow-2xs whitespace-nowrap font-sans"
            >
              <span className="font-medium text-slate-600">{item.metal} {item.purity}:</span>
              <span className="tabular-nums font-bold text-slate-900">
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
          className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-3 py-1 transition-colors shrink-0 cursor-pointer"
        >
          Update Rates
        </button>
      )}
    </div>
  )
}
