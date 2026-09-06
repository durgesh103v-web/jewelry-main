import React from 'react'
import { ScreenRenderer } from './ScreenRenderer'
import type { WorkspaceTab } from '../navigation/navigation.types'
import type { AppMenuChild } from '../../types/menu'

export interface AppWorkspaceProps {
  tabs: WorkspaceTab[]
  activeTabId: string
  setActiveTabId: (id: string) => void
  onCloseTab: (id: string) => void
  onNavigate: (id: string, label: string, module: AppMenuChild['module']) => void
  visibleScreenIds: Set<string>
}

export function AppWorkspace({
  tabs,
  activeTabId,
  setActiveTabId,
  onCloseTab,
  onNavigate,
  visibleScreenIds
}: AppWorkspaceProps): React.JSX.Element {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? {
    id: 'dashboard',
    label: 'Dashboard',
    module: 'home'
  }

  return (
    <div className="erp-app-workspace-inner">
      {/* Top Workspace Tab Strip (Only displayed when additional screens are open for multi-tasking) */}
      {tabs.length > 1 && (
        <div className="top-workspace-tabs-strip">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                className={`top-workspace-tab ${isActive ? 'active-tab' : ''}`}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
              >
                <span className="tab-title">{tab.label}</span>
                {tab.id !== 'dashboard' && (
                  <span
                    className="tab-close-icon"
                    title="Close Tab"
                    onClick={(event) => {
                      event.stopPropagation()
                      onCloseTab(tab.id)
                    }}
                  >
                    &times;
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Main Workspace Canvas (No Footer at all) */}
      <main className="workspace-screen-canvas">
        <ScreenRenderer
          activeTab={activeTab}
          onCloseTab={onCloseTab}
          onNavigate={onNavigate}
          visibleScreenIds={visibleScreenIds}
        />
      </main>
    </div>
  )
}
