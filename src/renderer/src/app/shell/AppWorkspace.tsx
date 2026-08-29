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
    <>
      <main className="workspace">
        <ScreenRenderer
          activeTab={activeTab}
          onCloseTab={onCloseTab}
          onNavigate={onNavigate}
          visibleScreenIds={visibleScreenIds}
        />
      </main>

      <footer className="bottom-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTabId ? 'workspace-tab active-tab' : 'workspace-tab'}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.id !== 'dashboard' && (
              <span
                className="tab-close"
                onClick={(event) => {
                  event.stopPropagation()
                  onCloseTab(tab.id)
                }}
              >
                &times;
              </span>
            )}
          </button>
        ))}
      </footer>
    </>
  )
}
