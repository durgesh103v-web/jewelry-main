import React, { useState, useEffect, useRef } from 'react'
import './AppTopNavbar.css'
import { getMenusForBusinessType } from '../../config/appMenus'
import type { AppMenuChild, BusinessTypeValue } from '../../types/menu'

export interface AppTopNavbarProps {
  activeScreenId: string
  onNavigate: (id: string, label: string, module: AppMenuChild['module'] | 'home') => void
  visibleScreenIds: Set<string>
  firmName?: string
  lastBackupLabel?: string
  username?: string
  role?: string
  businessType?: BusinessTypeValue
  onLogout?: () => void
  onOpenWhatsApp?: () => void
  onOpenSettings?: () => void
  onQuickScreenshot?: () => void
  capturingScreenshot?: boolean
}

export const AppTopNavbar: React.FC<AppTopNavbarProps> = ({
  activeScreenId,
  onNavigate,
  visibleScreenIds,
  firmName = 'Shree Jewellery',
  lastBackupLabel = '-',
  username = 'Durgesh_12',
  role = 'Administrator',
  businessType = 'RETAIL',
  onLogout,
  onOpenWhatsApp,
  onOpenSettings,
  onQuickScreenshot,
  capturingScreenshot = false
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [firmMenuOpen, setFirmMenuOpen] = useState(false)

  const navRef = useRef<HTMLElement | null>(null)

  // Get active filtered menus for current business type (Wholesale vs Retail)
  const menus = getMenusForBusinessType(businessType)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null)
        setUserMenuOpen(false)
        setFirmMenuOpen(false)
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Global Ctrl + K hotkey for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const searchEl = document.getElementById('navbar-global-search')
        searchEl?.focus()
        setSearchFocused(true)
      }
      if (e.key === 'Escape') {
        setOpenDropdownId(null)
        setUserMenuOpen(false)
        setFirmMenuOpen(false)
        setSearchFocused(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMenuClick = (menuId: string): void => {
    setOpenDropdownId((prev) => (prev === menuId ? null : menuId))
    setUserMenuOpen(false)
    setFirmMenuOpen(false)
  }

  const handleMenuMouseEnter = (menuId: string): void => {
    // If another menu is already open, hovering switches to the hovered menu (standard Windows desktop behavior)
    if (openDropdownId !== null) {
      setOpenDropdownId(menuId)
    }
  }

  const handleItemSelect = (item: AppMenuChild): void => {
    setOpenDropdownId(null)
    onNavigate(item.id, item.label, item.module)
  }

  return (
    <header className="desktop-top-navbar" ref={navRef}>
      {/* 1. LEFT SECTION: BRAND & NAVIGATION MENUS */}
      <div className="navbar-left-cluster">
        {/* Brand Identity / Logo */}
        <div className="navbar-brand-cluster" onClick={() => onNavigate('dashboard', 'Dashboard', 'home')}>
          <div className="navbar-brand-gem">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 3h12l4 6-10 13L2 9z" />
              <path d="M12 22V9" />
              <path d="m2 9 8 4 2-4 2 4 8-4" />
            </svg>
          </div>
          <span className="navbar-app-title">Jina Jewellery ERP</span>
        </div>

        {/* Home / Dashboard Item */}
        <button
          type="button"
          className={`nav-menu-btn ${activeScreenId === 'dashboard' ? 'active-home' : ''}`}
          onClick={() => {
            setOpenDropdownId(null)
            onNavigate('dashboard', 'Dashboard', 'home')
          }}
        >
          <span>Dashboard</span>
        </button>

        {/* 5 Primary Desktop Menus (Master, Transaction, GST / Estimate, Reports, Utility) */}
        <nav className="navbar-menu-items">
          {menus.map((menu) => {
            const isOpen = openDropdownId === menu.id
            const isChildActive = menu.children.some((c) => c.id === activeScreenId)

            return (
              <div key={menu.id} className="nav-menu-wrapper">
                <button
                  type="button"
                  className={`nav-menu-btn ${isOpen ? 'menu-open' : ''} ${isChildActive ? 'child-active' : ''}`}
                  onClick={() => handleMenuClick(menu.id)}
                  onMouseEnter={() => handleMenuMouseEnter(menu.id)}
                  aria-expanded={isOpen}
                >
                  <span>{menu.label}</span>
                  <span className="nav-menu-caret">▾</span>
                </button>

                {/* Classic Windows Desktop Dropdown Menu */}
                {isOpen && (
                  <div className="desktop-dropdown-pane" role="menu">
                    <div className="dropdown-scroll-body">
                      {menu.children.map((child) => {
                        const isSelected = child.id === activeScreenId
                        const isVisible = visibleScreenIds.has(child.id)
                        if (!isVisible && child.id !== 'dashboard') return null

                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`dropdown-menu-item ${isSelected ? 'selected-item' : ''}`}
                            onClick={() => handleItemSelect(child)}
                            role="menuitem"
                          >
                            <span className="item-bullet">•</span>
                            <span className="item-label">{child.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* 2. RIGHT SECTION: UTILITY CONTROLS */}
      <div className="navbar-right-cluster">
        {/* Global Search Input with Ctrl + K */}
        <div className={`navbar-search-box ${searchFocused ? 'search-active' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="navbar-global-search"
            type="text"
            className="navbar-search-input"
            placeholder="Search bills, barcodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          />
          <span className="search-shortcut-badge">Ctrl+K</span>
        </div>

        {/* Firm Selector Dropdown */}
        <div className="navbar-firm-selector">
          <button
            type="button"
            className="firm-select-btn"
            onClick={() => setFirmMenuOpen((prev) => !prev)}
            title="Active Firm"
          >
            <span className="firm-label-prefix">Firm</span>
            <span className="firm-name-text">{firmName}</span>
            <span className="firm-caret">▾</span>
          </button>
          {firmMenuOpen && (
            <div className="firm-dropdown-menu">
              <div className="firm-dropdown-header">Active Branch</div>
              <button
                type="button"
                className="firm-dropdown-item active"
                onClick={() => setFirmMenuOpen(false)}
              >
                ✓ {firmName} (Main Branch)
              </button>
              <div className="firm-dropdown-divider" />
              <button
                type="button"
                className="firm-dropdown-item"
                onClick={() => {
                  setFirmMenuOpen(false)
                  onNavigate('firm-master', 'Firm Master', 'master')
                }}
              >
                Manage Firms in Firm Master...
              </button>
            </div>
          )}
        </div>

        {/* Last Backup Indicator Button */}
        <button
          type="button"
          className="navbar-backup-btn"
          title="Click to manage database backup"
          onClick={() => onNavigate('backup', 'Backup', 'utility')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Last Backup: {lastBackupLabel}</span>
        </button>

        {/* WhatsApp Button */}
        {onOpenWhatsApp && (
          <button
            type="button"
            className="navbar-whatsapp-btn"
            title="WhatsApp Messaging & Customer Outreach"
            onClick={onOpenWhatsApp}
          >
            <span className="whatsapp-dot" />
            <span>WhatsApp</span>
          </button>
        )}

        {/* Screenshot Button */}
        {onQuickScreenshot && (
          <button
            type="button"
            className="navbar-tool-btn"
            title="Take Screen Shot"
            onClick={onQuickScreenshot}
            disabled={capturingScreenshot}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        )}

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            className="navbar-tool-btn"
            title="Application Settings"
            onClick={onOpenSettings}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}

        {/* User Profile Badge */}
        <div className="navbar-user-container">
          <button
            type="button"
            className="navbar-user-btn"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title={`Logged in as ${username} (${role})`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="navbar-username">{username}</span>
          </button>

          {userMenuOpen && (
            <div className="user-dropdown-menu">
              <div className="user-menu-header">
                <strong>{username}</strong>
                <span className="user-menu-role">{role}</span>
              </div>
              <div className="user-menu-divider" />
              <button
                type="button"
                className="user-menu-item"
                onClick={() => {
                  setUserMenuOpen(false)
                  onNavigate('change-password', 'Change Password', 'utility')
                }}
              >
                Change Password
              </button>
              {role === 'ADMIN' && (
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onNavigate('settings', 'Settings', 'utility')
                  }}
                >
                  System Configuration
                </button>
              )}
            </div>
          )}
        </div>

        {/* Logout Button (Classic Red Accent as in User Reference) */}
        {onLogout && (
          <button
            type="button"
            className="navbar-logout-btn"
            onClick={onLogout}
            title="Sign out of Jewellery ERP"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  )
}
