import React, { Suspense } from 'react'
import { screenRegistry } from '../navigation/screenRegistry'
import { DashboardScreen } from './DashboardScreen'
import { LoadingState } from '@components/ui'
import type { WorkspaceTab } from '../navigation/navigation.types'
import type { AppMenuChild } from '../../types/menu'

export interface ScreenRendererProps {
  activeTab: WorkspaceTab
  onCloseTab: (tabId: string) => void
  onNavigate: (id: string, label: string, module: AppMenuChild['module']) => void
  visibleScreenIds: Set<string>
}

function ModulePlaceholder({
  tab,
  onClose
}: {
  tab: WorkspaceTab
  onClose: () => void
}): React.JSX.Element {
  return (
    <section className="module-placeholder">
      <div className="module-window">
        <div className="module-title-bar">
          <span>{tab.label}</span>
          <div className="module-title-actions">
            <span>Module: {tab.module}</span>
            <button className="module-close-btn" type="button" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="module-body">
          <h2>{tab.label}</h2>
          <p>This screen will be developed here.</p>
          <div className="module-note">
            <strong>Next:</strong> Master - Account Group, Account Master, Item Master, Opening Stock, and Sale.
          </div>
        </div>
      </div>
    </section>
  )
}

export function ScreenRenderer({
  activeTab,
  onCloseTab,
  onNavigate,
  visibleScreenIds
}: ScreenRendererProps): React.JSX.Element {
  if (activeTab.id === 'dashboard') {
    return <DashboardScreen openQuickScreen={onNavigate} visibleScreenIds={visibleScreenIds} />
  }

  const screenEntry = screenRegistry[activeTab.id]

  if (!screenEntry) {
    return <ModulePlaceholder tab={activeTab} onClose={() => onCloseTab(activeTab.id)} />
  }

  const Component = screenEntry.component
  const defaultProps = screenEntry.defaultProps || {}

  return (
    <Suspense fallback={<LoadingState message={`Loading ${activeTab.label}...`} />}>
      <Component
        {...defaultProps}
        onClose={() => onCloseTab(activeTab.id)}
        onNavigate={onNavigate}
      />
    </Suspense>
  )
}
