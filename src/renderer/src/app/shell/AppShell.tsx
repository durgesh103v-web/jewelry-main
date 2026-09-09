import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './AppShell.css'
import AppAlert from '../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'
import { getVisibleScreenIds } from '../navigation/menu.config'
import { AppTopNavbar } from './AppTopNavbar'
import { AppWorkspace } from './AppWorkspace'
import { AppFooterTaskbar } from './AppFooterTaskbar'
import { useAlert } from '@renderer/hooks'
import type { AppMenuChild } from '../../types/menu'
import type { WorkspaceTab } from '../navigation/navigation.types'

const dashboardTab: WorkspaceTab = {
  id: 'dashboard',
  label: 'Dashboard',
  module: 'home'
}

function formatTopBarDateTime(value: string): string {
  if (!value) return '-'
  const [datePart, timePart = ''] = value.split(' ')
  const [year, month, day] = datePart.split('-')
  if (!year || !month || !day) return value
  const shortTime = timePart ? timePart.slice(0, 5) : ''
  return `${day}/${month}/${year}${shortTime ? ` ${shortTime}` : ''}`
}

export interface AppShellProps {
  session: AuthSession
  onLogout: () => void
}

export function AppShell({ session, onLogout }: AppShellProps): React.JSX.Element {
  const businessType = session.businessType
  const visibleScreenIds = useMemo(() => getVisibleScreenIds(businessType), [businessType])

  const [tabs, setTabs] = useState<WorkspaceTab[]>([dashboardTab])
  const [activeTabId, setActiveTabId] = useState('dashboard')
  const [topFirmName, setTopFirmName] = useState('Shree Jewellery')
  const [lastBackupLabel, setLastBackupLabel] = useState('-')
  const [capturingScreenshot, setCapturingScreenshot] = useState(false)

  const { alert, showAlert, clearAlert } = useAlert()

  const loadTopBarInfo = useCallback(async (): Promise<void> => {
    try {
      const [firm, lastBackup] = await Promise.all([
        window.api.firm.get(),
        window.api.backup.getLast()
      ])

      setTopFirmName(firm?.firmName || 'Shree Jewellery')
      setLastBackupLabel(formatTopBarDateTime(lastBackup?.backupAt || ''))
    } catch {
      setTopFirmName('Shree Jewellery')
      setLastBackupLabel('-')
    }
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadTopBarInfo()
    }, 0)

    const handleTopBarRefresh = (): void => {
      void loadTopBarInfo()
    }

    window.addEventListener('erp:backup-created', handleTopBarRefresh)
    window.addEventListener('erp:firm-updated', handleTopBarRefresh)

    return () => {
      window.clearTimeout(loadTimer)
      window.removeEventListener('erp:backup-created', handleTopBarRefresh)
      window.removeEventListener('erp:firm-updated', handleTopBarRefresh)
    }
  }, [loadTopBarInfo])

  const openScreen = useCallback(
    (screen: { id: string; label: string; module: AppMenuChild['module'] | 'home' }): void => {
      if (screen.id !== 'dashboard' && !visibleScreenIds.has(screen.id)) {
        return
      }

      setTabs((currentTabs) => {
        const alreadyOpen = currentTabs.some((tab) => tab.id === screen.id)
        if (alreadyOpen) return currentTabs
        return [
          ...currentTabs,
          {
            id: screen.id,
            label: screen.label,
            module: screen.module
          }
        ]
      })

      setActiveTabId(screen.id)
    },
    [visibleScreenIds]
  )

  const closeTab = useCallback(
    (tabId: string): void => {
      if (tabId === 'dashboard') return

      setTabs((currentTabs) => {
        const filteredTabs = currentTabs.filter((tab) => tab.id !== tabId)

        if (activeTabId === tabId) {
          const closedTabIndex = currentTabs.findIndex((tab) => tab.id === tabId)
          const nextActiveTab = filteredTabs[closedTabIndex - 1] ?? filteredTabs[0] ?? dashboardTab
          setActiveTabId(nextActiveTab.id)
        }

        return filteredTabs
      })
    },
    [activeTabId]
  )

  const openQuickScreen = useCallback(
    (id: string, label: string, module: AppMenuChild['module'] | 'home'): void => {
      openScreen({ id, label, module })
    },
    [openScreen]
  )

  const handleQuickScreenshot = async (): Promise<void> => {
    try {
      setCapturingScreenshot(true)
      const result = await window.api.screenshot.capture()
      showAlert('success', `Screenshot saved: ${result.fileName}`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCapturingScreenshot(false)
    }
  }

  return (
    <div className="erp-desktop-layout">
      {/* 1. Full-Width Desktop Top Navigation Bar (Zero Left Sidebar) */}
      <AppTopNavbar
        activeScreenId={activeTabId}
        onNavigate={openQuickScreen}
        visibleScreenIds={visibleScreenIds}
        firmName={topFirmName}
        lastBackupLabel={lastBackupLabel}
        username={session.username}
        role={session.role || 'Administrator'}
        businessType={session.businessType}
        onLogout={onLogout}
        onOpenWhatsApp={() => openQuickScreen('whatsapp', 'WhatsApp', 'utility')}
        onOpenSettings={() => openQuickScreen('settings', 'Settings', 'utility')}
        onQuickScreenshot={() => void handleQuickScreenshot()}
        capturingScreenshot={capturingScreenshot}
      />

      {alert && (
        <div className="header-toast">
          <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />
        </div>
      )}

      {/* 2. Main Full-Screen Workspace */}
      <div className="erp-desktop-workspace-container">
        <AppWorkspace
          tabs={tabs}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          onCloseTab={closeTab}
          onNavigate={openQuickScreen}
          visibleScreenIds={visibleScreenIds}
        />
      </div>

      {/* 3. Bottom Multi-Window Taskbar & System Status Bar */}
      <AppFooterTaskbar
        tabs={tabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        onCloseTab={closeTab}
        firmName={topFirmName}
      />
    </div>
  )
}
