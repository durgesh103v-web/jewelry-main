import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import {
  FiHome,
  FiFileText,
  FiShoppingCart,
  FiBox,
  FiUsers,
  FiLayers,
  FiSettings,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiMoreVertical
} from 'react-icons/fi'
import type { WorkspaceTab } from '../navigation/navigation.types'

export interface AppFooterTaskbarProps {
  tabs: WorkspaceTab[]
  activeTabId: string
  setActiveTabId: (id: string) => void
  onCloseTab: (id: string) => void
  onCloseOtherTabs?: (keepId: string) => void
  onCloseAllTabs?: () => void
  firmName?: string
  financialYear?: string
}

function getTabIcon(tabId: string, module?: string): React.JSX.Element {
  if (tabId === 'dashboard') {
    return <FiHome size={12} className="text-amber-600" />
  }
  const low = tabId.toLowerCase()
  if (low.includes('sale') || low.includes('pos') || low.includes('billing')) {
    return <FiShoppingCart size={12} className="text-amber-700" />
  }
  if (low.includes('estimate') || low.includes('quotation') || low.includes('invoice') || low.includes('gst')) {
    return <FiFileText size={12} className="text-blue-600" />
  }
  if (low.includes('account') || low.includes('customer') || low.includes('vendor') || low.includes('supplier')) {
    return <FiUsers size={12} className="text-violet-600" />
  }
  if (low.includes('item') || low.includes('stock') || low.includes('tag') || low.includes('inventory')) {
    return <FiBox size={12} className="text-emerald-600" />
  }
  if (low.includes('payment') || low.includes('receipt') || low.includes('advance') || low.includes('cash')) {
    return <FiDollarSign size={12} className="text-teal-600" />
  }
  if (low.includes('report') || low.includes('consignment') || low.includes('ledger')) {
    return <FiLayers size={12} className="text-indigo-600" />
  }
  if (low.includes('setting') || low.includes('printer') || low.includes('backup') || module === 'utility') {
    return <FiSettings size={12} className="text-slate-600" />
  }
  return <FiFileText size={12} className="text-slate-500" />
}

export const AppFooterTaskbar: React.FC<AppFooterTaskbarProps> = ({
  tabs,
  activeTabId,
  setActiveTabId,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  firmName = 'Shree Jewellery',
  financialYear = 'FY 2026-27'
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [menuOpenTabId, setMenuOpenTabId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')

  // Real-time clock updater
  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const checkScroll = useCallback((): void => {
    const el = scrollContainerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [checkScroll, tabs])

  // Automatically scroll active tab into view
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const activeEl = el.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  const handleScroll = (direction: 'left' | 'right'): void => {
    const el = scrollContainerRef.current
    if (!el) return
    const amount = direction === 'left' ? -180 : 180
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (): void => {
      setMenuOpenTabId(null)
    }
    if (menuOpenTabId) {
      document.addEventListener('click', handleOutsideClick)
      return () => document.removeEventListener('click', handleOutsideClick)
    }
    return undefined
  }, [menuOpenTabId])

  const nonDashboardTabsCount = useMemo(
    () => tabs.filter((t) => t.id !== 'dashboard').length,
    [tabs]
  )

  return (
    <footer className="h-8.5 min-h-[34px] bg-white border-t border-slate-200/90 px-2.5 flex items-center justify-between select-none shadow-xs relative z-30 font-sans text-slate-800 no-print">
      {/* 1. LEFT SECTION: WINDOW TABS LIST */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden pr-2">
        {/* Overflow Left Scroll Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-5 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
            title="Scroll open tabs left"
          >
            <FiChevronLeft size={13} />
          </button>
        )}

        {/* Scrollable Tabs Viewport */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-1.5 overflow-x-auto min-w-0 py-0.5 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId
            const isDashboard = tab.id === 'dashboard'

            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className={`group relative inline-flex items-center gap-1.5 h-6.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none max-w-[210px] shrink-0 ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-950 font-bold border border-amber-300/80 shadow-2xs'
                    : 'bg-slate-100/90 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
                }`}
                onClick={() => setActiveTabId(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (!isDashboard) {
                    setMenuOpenTabId(tab.id)
                  }
                }}
                title={`${tab.label} (Click to view)`}
              >
                {/* Tab Icon */}
                <span className="shrink-0 flex items-center justify-center">
                  {getTabIcon(tab.id, tab.module)}
                </span>

                {/* Tab Label */}
                <span className="truncate max-w-[130px]">{tab.label}</span>

                {/* Active Underline Pill */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber-600" />
                )}

                {/* Close Button for non-dashboard tabs */}
                {!isDashboard && (
                  <button
                    type="button"
                    className="w-4 h-4 rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-100/80 flex items-center justify-center shrink-0 transition-colors ml-0.5 cursor-pointer"
                    title={`Close ${tab.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseTab(tab.id)
                    }}
                  >
                    <FiX size={11} />
                  </button>
                )}

                {/* Tab Context Menu */}
                {menuOpenTabId === tab.id && !isDashboard && (
                  <div
                    className="absolute bottom-full left-0 mb-1.5 w-44 bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-50 animate-in fade-in-50 zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                      onClick={() => {
                        setMenuOpenTabId(null)
                        onCloseTab(tab.id)
                      }}
                    >
                      <FiX size={12} className="text-slate-500" />
                      <span>Close Tab</span>
                    </button>

                    {onCloseOtherTabs && tabs.length > 2 && (
                      <button
                        type="button"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                        onClick={() => {
                          setMenuOpenTabId(null)
                          onCloseOtherTabs(tab.id)
                        }}
                      >
                        <FiLayers size={12} className="text-amber-600" />
                        <span>Close Other Tabs</span>
                      </button>
                    )}

                    {onCloseAllTabs && nonDashboardTabsCount > 0 && (
                      <button
                        type="button"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left flex items-center gap-2 cursor-pointer"
                        onClick={() => {
                          setMenuOpenTabId(null)
                          onCloseAllTabs()
                        }}
                      >
                        <FiTrash2 size={12} className="text-rose-600" />
                        <span>Close All Tabs</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Overflow Right Scroll Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-5 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
            title="Scroll open tabs right"
          >
            <FiChevronRight size={13} />
          </button>
        )}
      </div>

      {/* 2. RIGHT SECTION: SYSTEM STATUS & QUICK DIAGNOSTICS */}
      <div className="flex items-center gap-2 shrink-0 font-sans text-xs text-slate-600 pl-2">
        {/* Open Windows Count Badge */}
        {tabs.length > 1 && (
          <div className="relative inline-flex items-center">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold shadow-2xs"
              title={`${tabs.length} total windows open (Right-click tab for options)`}
            >
              <FiLayers size={11} className="text-amber-700" />
              <span>{tabs.length} Tabs</span>
            </div>

            {onCloseAllTabs && nonDashboardTabsCount > 1 && (
              <button
                type="button"
                className="ml-1 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Close all open tabs"
                onClick={onCloseAllTabs}
              >
                <FiMoreVertical size={12} />
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-3.5 bg-slate-200 mx-0.5 hidden sm:block" />

        {/* Live Showroom Database Badge */}
        <div
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800"
          title="Active Showroom Profile & Local SQLite Live Database"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-2xs" />
          </span>
          <span className="truncate max-w-[140px]">{firmName}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

        {/* Fiscal Year Badge */}
        <div
          className="font-mono text-[11px] font-bold text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 shadow-2xs"
          title="Active Financial Assessment Period"
        >
          {financialYear}
        </div>

        {/* Divider */}
        <div className="w-px h-3.5 bg-slate-200 mx-0.5 hidden md:block" />

        {/* Live System Clock */}
        {currentTime && (
          <div
            className="hidden md:inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-600 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 shadow-2xs"
            title="Local System Time"
          >
            <FiClock size={11} className="text-amber-600" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

        {/* System Online / Ready Status */}
        <div
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold shadow-2xs"
          title="Jewellery ERP Desktop Operational"
        >
          <FiCheckCircle size={12} className="text-emerald-600 stroke-[2.5]" />
          <span>Ready</span>
        </div>
      </div>
    </footer>
  )
}

export default AppFooterTaskbar
