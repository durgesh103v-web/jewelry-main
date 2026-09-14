import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  FiArrowLeft,
  FiSearch,
  FiMessageCircle,
  FiCamera,
  FiSettings,
  FiKey,
  FiLogOut,
  FiChevronDown,
  FiPrinter,
  FiDatabase
} from 'react-icons/fi'
import { getMenusForBusinessType } from '../../config/appMenus'
import type { AppMenuChild, BusinessTypeValue } from '../../types/menu'

export interface AppTopNavbarProps {
  activeScreenId: string
  onNavigate: (id: string, label: string, module: AppMenuChild['module'] | 'home') => void
  onGoBack?: () => void
  canGoBack?: boolean
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
  onGoBack,
  canGoBack = true,
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

  const navRef = useRef<HTMLElement | null>(null)

  // Get active filtered menus for current business type (Wholesale vs Retail)
  const menus = useMemo(() => getMenusForBusinessType(businessType), [businessType])

  // Flattened searchable list of all visible screens
  const allSearchableScreens = useMemo(() => {
    const list: { id: string; label: string; module: AppMenuChild['module']; parentMenu: string }[] = []
    
    // Add Dashboard
    list.push({
      id: 'dashboard',
      label: 'Showroom Executive Dashboard',
      module: 'home' as any,
      parentMenu: 'Overview'
    })

    for (const m of menus) {
      for (const child of m.children) {
        if (visibleScreenIds.has(child.id) || child.id === 'dashboard') {
          list.push({
            id: child.id,
            label: child.label,
            module: child.module,
            parentMenu: m.label
          })
        }
      }
    }
    return list
  }, [menus, visibleScreenIds])

  // Real-time filtered search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return allSearchableScreens.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.parentMenu.toLowerCase().includes(q)
    )
  }, [allSearchableScreens, searchQuery])

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
    if (openDropdownId !== null) {
      setOpenDropdownId(menuId)
    }
  }

  const handleItemSelect = (item: { id: string; label: string; module: AppMenuChild['module'] | 'home' }): void => {
    setOpenDropdownId(null)
    setUserMenuOpen(false)
    setSearchFocused(false)
    setSearchQuery('')
    onNavigate(item.id, item.label, item.module)
  }

  return (
    <header
      ref={navRef}
      className="h-11 bg-white border-b border-slate-200/90 px-3 flex items-center justify-between select-none shadow-xs relative z-30 font-sans text-slate-800"
    >
      {/* 1. LEFT SECTION: BRAND, BACK & NAVIGATION MENUS */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Universal Back Button */}
        {activeScreenId !== 'dashboard' && (
          <button
            type="button"
            disabled={!canGoBack}
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 border border-amber-400/80 transition-all cursor-pointer shadow-2xs select-none active:scale-95 group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (onGoBack) {
                onGoBack()
              } else {
                onNavigate('dashboard', 'Dashboard', 'home')
              }
            }}
            title="Go Back to Previous Screen (Alt + Left Arrow)"
          >
            <FiArrowLeft className="w-3.5 h-3.5 text-amber-800 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
        )}

        {/* Home / Dashboard Item */}
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeScreenId === 'dashboard'
              ? 'bg-amber-500/15 text-amber-950 border border-amber-300/70 shadow-2xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
          }`}
          onClick={() => {
            setOpenDropdownId(null)
            onNavigate('dashboard', 'Dashboard', 'home')
          }}
          title="Showroom Executive Dashboard"
        >
          <div className="w-4 h-4 rounded-md bg-amber-500/15 flex items-center justify-center text-amber-700">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M6 3h12l4 6-10 13L2 9z" />
              <path d="M12 22V9" />
              <path d="m2 9 8 4 2-4 2 4 8-4" />
            </svg>
          </div>
          <span>Dashboard</span>
        </button>

        {/* Primary Desktop Menus (Master, Transaction, GST / Estimate, Reports, Utility) */}
        <nav className="flex items-center gap-0.5 ml-1" aria-label="Main Navigation">
          {menus.map((menu) => {
            const isOpen = openDropdownId === menu.id
            const isChildActive = menu.children.some((c) => c.id === activeScreenId)

            return (
              <div key={menu.id} className="relative">
                <button
                  type="button"
                  className={`h-7.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1 ${
                    isOpen
                      ? 'bg-amber-500/15 text-amber-950 font-bold shadow-2xs border border-amber-300/60'
                      : isChildActive
                      ? 'text-amber-900 font-bold bg-amber-50 border border-amber-200/80'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                  }`}
                  onClick={() => handleMenuClick(menu.id)}
                  onMouseEnter={() => handleMenuMouseEnter(menu.id)}
                  aria-expanded={isOpen}
                >
                  <span>{menu.label}</span>
                  <FiChevronDown
                    className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-amber-700' : ''
                    }`}
                  />
                </button>

                {/* Desktop Dropdown Pane */}
                {isOpen && (
                  <div
                    className="absolute left-0 top-full mt-1.5 min-w-[230px] max-w-[340px] bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100"
                    role="menu"
                  >
                    <div className="px-3 py-1 mb-1 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {menu.label} Modules
                      </span>
                      <span className="text-[10px] font-mono text-amber-700 font-bold">
                        {menu.children.filter((c) => visibleScreenIds.has(c.id)).length} screens
                      </span>
                    </div>

                    <div className="max-h-[calc(100vh-140px)] overflow-y-auto py-0.5">
                      {menu.children.map((child) => {
                        const isSelected = child.id === activeScreenId
                        const isVisible = visibleScreenIds.has(child.id)
                        if (!isVisible && child.id !== 'dashboard') return null

                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`w-[calc(100%-8px)] mx-1 px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-left transition-all cursor-pointer group ${
                              isSelected
                                ? 'bg-amber-50 text-amber-950 font-bold shadow-2xs border border-amber-200'
                                : 'text-slate-700 hover:bg-amber-50/70 hover:text-amber-900 font-medium'
                            }`}
                            onClick={() => handleItemSelect(child)}
                            role="menuitem"
                          >
                            <span className="truncate">{child.label}</span>
                            {isSelected ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 ml-2 shadow-2xs" />
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
        {/* Proper Global Search Bar with Live Command Palette */}
        <div className="relative flex items-center">
          <div
            className={`flex items-center gap-2 h-7.5 px-2.5 rounded-lg border transition-all duration-150 ${
              searchFocused || searchQuery
                ? 'w-72 bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs text-slate-800'
                : 'w-56 bg-slate-100/80 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 text-slate-500'
            }`}
          >
            <FiSearch
              size={13}
              className={`shrink-0 ${searchFocused || searchQuery ? 'text-amber-600' : 'text-slate-400'}`}
            />
            <input
              id="navbar-global-search"
              type="text"
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              placeholder="Search bills, barcodes, screens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  handleItemSelect(searchResults[0])
                }
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] shrink-0 cursor-pointer"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            ) : (
              <kbd className="hidden sm:inline-block text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-1 py-0.2 rounded shadow-2xs">
                Ctrl+K
              </kbd>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {searchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-slate-200 shadow-2xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-2.5 py-1 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Matching Modules</span>
                <span>{searchResults.length} results</span>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {searchResults.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No matching screens or modules found.
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className="w-full px-2.5 py-2 rounded-lg text-xs text-left hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-amber-950">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.parentMenu} · {item.id}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-amber-200/60 group-hover:text-amber-900 font-bold uppercase">
                        Open
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Action Icon Suite */}
        <div className="flex items-center gap-1">
          {/* WhatsApp */}
          {onOpenWhatsApp && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 relative transition-colors cursor-pointer"
              title="WhatsApp Messages & Customer Outreach"
              onClick={onOpenWhatsApp}
              aria-label="WhatsApp"
            >
              <FiMessageCircle size={15} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            </button>
          )}

          {/* Screenshot */}
          {onQuickScreenshot && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-40 cursor-pointer"
              title="Capture High-Res Screenshot"
              onClick={onQuickScreenshot}
              disabled={capturingScreenshot}
              aria-label="Take Screenshot"
            >
              <FiCamera size={15} className={capturingScreenshot ? 'animate-spin text-amber-600' : ''} />
            </button>
          )}

          {/* Settings */}
          {onOpenSettings && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Settings & System Configuration"
              onClick={onOpenSettings}
              aria-label="Settings"
            >
              <FiSettings size={15} />
            </button>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 h-7.5 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title={`Logged in as ${username} (${role})`}
          >
            <span className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-black text-[9px] flex items-center justify-center shadow-2xs shrink-0">
              {username.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate hidden md:inline">
              {username}
            </span>
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg mb-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 truncate">{username}</div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900">{role}</span>
                </div>
                <div className="text-[10px] text-slate-600 font-semibold truncate mt-0.5">{firmName}</div>
                {lastBackupLabel && lastBackupLabel !== '-' && (
                  <div className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-amber-200/40">
                    Backup: {lastBackupLabel}
                  </div>
                )}
              </div>

              <div className="py-1">
                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                  onClick={() => handleItemSelect({ id: 'change-password', label: 'Change Password', module: 'utility' })}
                >
                  <FiKey size={13} className="text-amber-600" />
                  <span>Change Password</span>
                </button>

                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                  onClick={() => handleItemSelect({ id: 'printer-setting', label: 'Printer & Bill Settings', module: 'utility' })}
                >
                  <FiPrinter size={13} className="text-amber-600" />
                  <span>Printer Settings</span>
                </button>

                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                  onClick={() => handleItemSelect({ id: 'settings', label: 'Settings', module: 'utility' })}
                >
                  <FiSettings size={13} className="text-amber-600" />
                  <span>System Configuration</span>
                </button>

                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left flex items-center gap-2 cursor-pointer"
                  onClick={() => handleItemSelect({ id: 'backup', label: 'Backup & Restore', module: 'utility' })}
                >
                  <FiDatabase size={13} className="text-amber-600" />
                  <span>Backup & Restore</span>
                </button>
              </div>

              <div className="h-px bg-slate-100 my-1" />

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors text-left flex items-center gap-2 cursor-pointer"
                  onClick={onLogout}
                >
                  <FiLogOut size={13} className="text-rose-600" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Logout Icon */}
        {onLogout && (
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            onClick={onLogout}
            title="Sign out of Jewellery ERP"
            aria-label="Logout"
          >
            <FiLogOut size={15} />
          </button>
        )}
      </div>
    </header>
  )
}

export default AppTopNavbar
