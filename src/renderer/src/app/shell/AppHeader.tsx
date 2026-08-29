import React, { useState } from 'react'
import type { AppMenu, AppMenuChild } from '../../types/menu'

export interface AppHeaderProps {
  visibleMenus: AppMenu[]
  onOpenScreen: (screen: AppMenuChild) => void
  topFirmName: string
  lastBackupLabel: string
  capturingScreenshot: boolean
  onQuickScreenshot: () => void
  username: string
  businessType: 'WHOLESALE' | 'RETAIL'
  onLogout: () => void
}

export function AppHeader({
  visibleMenus,
  onOpenScreen,
  topFirmName,
  lastBackupLabel,
  capturingScreenshot,
  onQuickScreenshot,
  username,
  businessType,
  onLogout
}: AppHeaderProps): React.JSX.Element {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  return (
    <div className="top-bar">
      <nav className="menu-bar" aria-label="Application menu">
        {visibleMenus.map((menu) => (
          <div
            key={menu.id}
            className="menu-item"
            onMouseEnter={() => setOpenMenu(menu.id)}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              className="menu-button"
              type="button"
              onClick={() =>
                setOpenMenu((currentMenu) => (currentMenu === menu.id ? null : menu.id))
              }
            >
              {menu.label}
            </button>

            {openMenu === menu.id && (
              <div className="dropdown">
                {menu.children.map((child) => (
                  <button
                    key={child.id}
                    className="dropdown-item"
                    type="button"
                    onClick={() => {
                      onOpenScreen(child)
                      setOpenMenu(null)
                    }}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="top-actions">
        <label htmlFor="firm-select">Firm</label>
        <select
          id="firm-select"
          className="firm-select"
          value={topFirmName}
          onChange={() => undefined}
        >
          <option value={topFirmName}>{topFirmName}</option>
        </select>

        <button className="last-backup" type="button">
          Last Backup {lastBackupLabel}
        </button>
        <button
          className="header-icon-btn"
          type="button"
          title="Take a screenshot of the current screen"
          aria-label="Take a screenshot of the current screen"
          onClick={onQuickScreenshot}
          disabled={capturingScreenshot}
        >
          {capturingScreenshot ? '⏳' : '\u{1F4F7}'}
        </button>
        <button
          className="whatsapp-btn"
          type="button"
          onClick={() =>
            onOpenScreen({ id: 'whatsapp', label: 'WhatsApp', module: 'utility' })
          }
        >
          &#128994; WhatsApp
        </button>

        <span
          title={`Business type: ${businessType === 'WHOLESALE' ? 'Wholesaler' : 'Retailer'}`}
          style={{
            marginLeft: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#1b2a4a',
            whiteSpace: 'nowrap'
          }}
        >
          &#128100; {username}
        </span>
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          style={{
            marginLeft: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            background: '#c0392b',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
