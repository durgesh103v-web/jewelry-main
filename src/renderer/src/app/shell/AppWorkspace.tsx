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
  onGoBack?: () => void
  visibleScreenIds: Set<string>
}

export function AppWorkspace({
  tabs,
  activeTabId,
  onCloseTab,
  onNavigate,
  onGoBack,
  visibleScreenIds
}: AppWorkspaceProps): React.JSX.Element {
  const safeTabs =
    tabs.length > 0
      ? tabs
      : [
          {
            id: 'dashboard',
            label: 'Dashboard',
            module: 'home' as const
          }
        ]

  return (
    <div className="erp-app-workspace-inner">
      {/* Main Workspace Canvas (Full Height, Multi-Tab Persistent Keep-Alive) */}
      <main className="workspace-screen-canvas relative w-full h-full flex-1">
        {safeTabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`w-full h-full flex-1 flex flex-col ${isActive ? 'flex' : 'hidden'}`}
              style={{
                display: isActive ? 'flex' : 'none',
                flex: 1,
                width: '100%',
                height: '100%',
                minHeight: 0
              }}
              aria-hidden={!isActive}
            >
              <ScreenRenderer
                activeTab={tab}
                onCloseTab={onCloseTab}
                onNavigate={onNavigate}
                onGoBack={onGoBack}
                visibleScreenIds={visibleScreenIds}
              />
            </div>
          )
        })}
      </main>
    </div>
  )
}

