import React, { useState, useEffect, useRef } from 'react'
import {
  FiSearch,
  FiMessageCircle,
  FiCamera,
  FiSettings,
  FiKey,
  FiLogOut
} from 'react-icons/fi'
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
  firmName: _firmName = 'Shree Jewellery',
  lastBackupLabel: _lastBackupLabel = '-',
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

  const navRef = useRef<HTMLElement | null>(null)

  // Get active filtered menus for current business type (Wholesale vs Retail)
  const menus = getMenusForBusinessType(businessType)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null)
        setUserMenuOpen(false)
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Global Ctrl + K hotkey for search & Escape to dismiss
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
        setSearchFocused(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMenuClick = (menuId: string): void => {
    setOpenDropdownId((prev) => (prev === menuId ? null : menuId))
    setUserMenuOpen(false)
  }

  const handleMenuMouseEnter = (menuId: string): void => {
    // If another menu is already open, hovering switches to the hovered menu
    if (openDropdownId !== null) {
      setOpenDropdownId(menuId)
    }
  }

  const handleItemSelect = (item: AppMenuChild): void => {
    setOpenDropdownId(null)
    onNavigate(item.id, item.label, item.module)
  }

  return (
    <header
      ref={navRef}
      className="h-11 bg-white border-b border-slate-200/90 px-3.5 flex items-center justify-between select-none shadow-sm relative z-30"
      style={{ boxShadow: '0 1px 0 #e2e8f0, 0 2px 8px rgba(15,23,42,0.04)' }}
    >
      {/* 1. LEFT SECTION: NAVIGATION MENUS */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Home / Dashboard Item */}
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeScreenId === 'dashboard'
              ? 'bg-amber-500/10 text-amber-800'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
          onClick={() => {
            setOpenDropdownId(null)
            onNavigate('dashboard', 'Dashboard', 'home')
          }}
          title="Showroom Dashboard"
        >
          <svg
            className="w-4 h-4 text-amber-600 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M6 3h12l4 6-10 13L2 9z" />
            <path d="M12 22V9" />
            <path d="m2 9 8 4 2-4 2 4 8-4" />
          </svg>
          <span>Dashboard</span>
        </button>

        {/* Primary Desktop Menus (Master, Transaction, GST / Estimate, Reports, Utility) */}
        <nav className="flex items-center gap-0.5" aria-label="Main Navigation">
          {menus.map((menu) => {
            const isOpen = openDropdownId === menu.id
            const isChildActive = menu.children.some((c) => c.id === activeScreenId)

            return (
              <div key={menu.id} className="relative">
                <button
                  type="button"
                  className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                    isOpen
                      ? 'bg-amber-500/15 text-amber-900 font-bold shadow-2xs'
                      : isChildActive
                      ? 'text-amber-800 font-bold bg-amber-50/70 hover:bg-amber-100/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  onClick={() => handleMenuClick(menu.id)}
                  onMouseEnter={() => handleMenuMouseEnter(menu.id)}
                  aria-expanded={isOpen}
                >
                  <span>{menu.label}</span>
                </button>

                {/* Desktop Dropdown Pane */}
                {isOpen && (
                  <div
                    className="absolute left-0 top-full mt-1.5 min-w-[220px] max-w-[320px] bg-white rounded-xl border border-slate-200/90 shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100"
                    role="menu"
                  >
                    <div className="max-h-[calc(100vh-140px)] overflow-y-auto py-0.5">
                      {menu.children.map((child) => {
                        const isSelected = child.id === activeScreenId
                        const isVisible = visibleScreenIds.has(child.id)
                        if (!isVisible && child.id !== 'dashboard') return null

                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`w-[calc(100%-8px)] mx-1 px-3 py-2 rounded-lg text-xs flex items-center justify-between text-left transition-all cursor-pointer group ${
                              isSelected
                                ? 'bg-amber-50 text-amber-950 font-bold shadow-2xs'
                                : 'text-slate-700 hover:bg-amber-50/70 hover:text-amber-900 font-medium'
                            }`}
                            onClick={() => handleItemSelect(child)}
                            role="menuitem"
                          >
                            <span className="truncate">{child.label}</span>
                            {isSelected ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 ml-2" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-amber-400/60 shrink-0 ml-2 transition-colors" />
                            )}
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

      {/* 2. RIGHT SECTION: SEARCH BAR & ACTION ICONS */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Proper Global Search Bar */}
        <div className="relative flex items-center">
          <div
            className={`flex items-center gap-2 h-8 px-2.5 rounded-lg border transition-all duration-150 ${
              searchFocused
                ? 'w-72 bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs text-slate-800'
                : 'w-56 bg-slate-100/80 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 text-slate-500'
            }`}
          >
            <FiSearch
              size={14}
              className={`shrink-0 ${searchFocused ? 'text-amber-600' : 'text-slate-400'}`}
            />
            <input
              id="navbar-global-search"
              type="text"
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              placeholder="Search bills, barcodes, accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] shrink-0"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            ) : (
              <kbd className="hidden sm:inline-block text-[10px] font-medium text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded shadow-2xs">
                Ctrl+K
              </kbd>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Action Icon Suite */}
        <div className="flex items-center gap-1">
          {/* WhatsApp */}
          {onOpenWhatsApp && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 relative transition-colors cursor-pointer"
              title="WhatsApp Messages & Customer Outreach"
              onClick={onOpenWhatsApp}
              aria-label="WhatsApp"
            >
              <FiMessageCircle size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            </button>
          )}

          {/* Screenshot */}
          {onQuickScreenshot && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40 cursor-pointer"
              title="Take Screenshot"
              onClick={onQuickScreenshot}
              disabled={capturingScreenshot}
              aria-label="Take Screenshot"
            >
              <FiCamera size={16} />
            </button>
          )}

          {/* Settings */}
          {onOpenSettings && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Application Settings"
              onClick={onOpenSettings}
              aria-label="Settings"
            >
              <FiSettings size={16} />
            </button>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title={`Logged in as ${username} (${role})`}
          >
            <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs shrink-0">
              {username.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate hidden md:inline">
              {username}
            </span>
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-3 py-2 bg-slate-50/80 rounded-lg mb-1">
                <div className="text-xs font-bold text-slate-800 truncate">{username}</div>
                <div className="text-[10px] font-semibold text-amber-700 mt-0.5">{role}</div>
              </div>
              <div className="h-px bg-slate-100 my-1" />
              <button
                type="button"
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setUserMenuOpen(false)
                  onNavigate('change-password', 'Change Password', 'utility')
                }}
              >
                <FiKey size={14} className="text-slate-400" />
                <span>Change Password</span>
              </button>
              {role === 'ADMIN' && (
                <button
                  type="button"
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onNavigate('settings', 'Settings', 'utility')
                  }}
                >
                  <FiSettings size={14} className="text-slate-400" />
                  <span>System Configuration</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            onClick={onLogout}
            title="Sign out of Jewellery ERP"
            aria-label="Logout"
          >
            <FiLogOut size={16} />
          </button>
        )}
      </div>
    </header>
  )
}
