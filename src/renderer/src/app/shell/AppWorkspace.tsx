import React from 'react'
import { ScreenRenderer } from './ScreenRenderer'
import type { WorkspaceTab } from '../navigation/navigation.types'
import type { AppMenuChild } from '../../types/menu'

export interface AppWorkspaceProps {
  tabs: WorkspaceTab[]
  activeTabId: string
  setActiveTabId: (id: string) => void
  onCloseTab: (id: string) => void
  onNavigate: (id: string, label: string, module: AppMenuChild['module'] | 'home') => void
  visibleScreenIds: Set<string>
}

export function AppWorkspace({
  tabs,
  activeTabId,
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
      {/* Main Workspace Canvas (Full Height, Tabs moved to Footer Taskbar) */}
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
