import React from 'react'
import { FiHome, FiFileText, FiX, FiCheckCircle } from 'react-icons/fi'
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
  return (
    <footer className="erp-desktop-footer-taskbar select-none no-print">
      {/* Left: Window Tabs Container */}
      <div className="footer-tabs-scroll-area">
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
                    <FiX size={12} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Status & Quick Info Bar */}
      <div className="footer-status-info">
        <div className="status-item firm-badge" title="Active Shop Profile">
          <span className="dot online" />
          <span className="text-slate-700 font-semibold">{firmName}</span>
        </div>

        <div className="status-divider" />

        <div className="status-item font-mono text-[11px] text-slate-500" title="Financial Year">
          <span>FY 2026-27</span>
        </div>

        <div className="status-divider" />

        <div className="status-item system-ready" title="System Operational & Local SQLite DB Online">
          <FiCheckCircle size={12} className="text-emerald-600" />
          <span className="text-emerald-700 font-medium">Ready</span>
        </div>
      </div>
    </footer>
  )
}
