import React, { useState, useEffect } from 'react'

export interface AppCommandBarProps {
  onNewSale: () => void
  onOpenSettings: () => void
  onOpenNotifications: () => void
  onOpenWhatsApp?: () => void
  onQuickScreenshot?: () => void
  capturingScreenshot?: boolean
  onLogout?: () => void
  username?: string
  role?: string
  branchName?: string
}

export const AppCommandBar: React.FC<AppCommandBarProps> = ({
  onNewSale,
  onOpenSettings,
  onOpenNotifications,
  onOpenWhatsApp,
  onQuickScreenshot,
  capturingScreenshot = false,
  onLogout,
  username = 'Alston',
  role = 'Administrator',
  branchName = 'Main Branch • Chennai'
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('shell-global-search')
        searchInput?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="erp-top-command-bar">
      {/* Global Search with Ctrl+K */}
      <div className="command-bar-search-wrap">
        <svg className="command-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="shell-global-search"
          className="command-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search invoice, customer, SKU, order, consignment..."
        />
        <span className="command-search-shortcut">Ctrl + K</span>
      </div>

      {/* Right Command Actions */}
      <div className="command-bar-actions">
        {/* Location / Branch Badge */}
        <div className="command-location-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{branchName}</span>
        </div>

        {/* Primary Action Button: + New Sale */}
        <button type="button" className="command-primary-btn" onClick={onNewSale}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>+ New Sale</span>
        </button>

        {/* WhatsApp Button if available */}
        {onOpenWhatsApp && (
          <button
            type="button"
            className="command-icon-btn"
            title="WhatsApp Messaging"
            onClick={onOpenWhatsApp}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
        )}

        {/* Screenshot Button */}
        {onQuickScreenshot && (
          <button
            type="button"
            className="command-icon-btn"
            title="Take Screenshot"
            onClick={onQuickScreenshot}
            disabled={capturingScreenshot}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        )}

        {/* Notifications Icon */}
        <button
          type="button"
          className="command-icon-btn"
          title="Notifications & Reminders"
          onClick={onOpenNotifications}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="notification-badge-count">3</span>
        </button>

        {/* Settings Icon */}
        <button
          type="button"
          className="command-icon-btn"
          title="Application Settings"
          onClick={onOpenSettings}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* User Profile Badge & Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            className="command-user-profile"
            style={{ cursor: 'pointer' }}
            onClick={() => setUserDropdownOpen((prev) => !prev)}
          >
            <div className="command-user-avatar">
              {username.slice(0, 1).toUpperCase()}
            </div>
            <div className="command-user-meta">
              <span className="command-user-name">{username}</span>
              <span className="command-user-role">{role}</span>
            </div>
          </div>

          {userDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '42px',
                right: '0',
                background: '#ffffff',
                border: '1px solid #e2e5eb',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                padding: '6px',
                zIndex: 1000,
                minWidth: '150px'
              }}
            >
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => {
                  setUserDropdownOpen(false)
                  onLogout?.()
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Logout Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
