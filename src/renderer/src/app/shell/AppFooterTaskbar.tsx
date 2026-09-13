import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  FiHome,
  FiFileText,
  FiX,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiLayers
} from 'react-icons/fi'
import type { WorkspaceTab } from '../navigation/navigation.types'

export interface AppFooterTaskbarProps {
  tabs: WorkspaceTab[]
  activeTabId: string
  setActiveTabId: (id: string) => void
  onCloseTab: (id: string) => void
  firmName?: string
}

export function AppFooterTaskbar({
  tabs,
  activeTabId,
  setActiveTabId,
  onCloseTab,
  firmName = 'Shree Jewellery'
}: AppFooterTaskbarProps): React.JSX.Element {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  // Scroll active tab into view when activeTabId changes
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const activeEl = el.querySelector<HTMLElement>('.footer-window-tab.active')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  const handleScroll = (direction: 'left' | 'right'): void => {
    const el = scrollContainerRef.current
    if (!el) return
    const amount = direction === 'left' ? -200 : 200
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <footer className="erp-desktop-footer-taskbar select-none no-print">
      {/* Left: Window Tabs Container & Scroll Controls */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden pr-2">
        {/* Scroll Left Button if overflow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-5 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
            title="Scroll tabs left"
          >
            <FiChevronLeft size={13} />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="footer-tabs-scroll-area"
        >
          <div className="footer-tabs-list">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId
              const isDashboard = tab.id === 'dashboard'

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`footer-window-tab ${isActive ? 'active' : ''}`}
                  title={`Switch to ${tab.label}`}
                >
                  <span className="tab-icon">
                    {isDashboard ? <FiHome size={13} /> : <FiFileText size={13} />}
                  </span>
                  <span className="tab-label">{tab.label}</span>

                  {!isDashboard && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="tab-close-btn"
                      title={`Close ${tab.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCloseTab(tab.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          onCloseTab(tab.id)
                        }
                      }}
                    >
                      <FiX size={11} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scroll Right Button if overflow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-5 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
            title="Scroll tabs right"
          >
            <FiChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Right: Status & Quick Info Bar */}
      <div className="footer-status-info">
        {/* Open windows count */}
        {tabs.length > 1 && (
          <div
            className="status-item hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold"
            title={`${tabs.length} open screen tabs`}
          >
            <FiLayers size={10} className="text-slate-500" />
            <span>{tabs.length} Tabs</span>
          </div>
        )}

        <div className="status-divider hidden sm:block" />

        <div className="status-item firm-badge" title="Active Showroom Profile">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-slate-800 font-bold tracking-tight">{firmName}</span>
        </div>

        <div className="status-divider" />

        <div className="status-item font-mono text-[11px] font-semibold text-slate-600" title="Active Financial Period">
          <span>FY 2026-27</span>
        </div>

        <div className="status-divider" />

        <div className="status-item system-ready" title="System Operational & Local SQLite Database Online">
          <FiCheckCircle size={12} className="text-emerald-600 stroke-[2.2]" />
          <span className="text-emerald-700 font-bold text-[11px]">Ready</span>
        </div>
      </div>
    </footer>
  )
}

