import React from 'react'
import type { AppMenuChild } from '../../types/menu'

export interface AppSidebarProps {
  activeScreenId: string
  onNavigate: (id: string, label: string, module: AppMenuChild['module']) => void
  visibleScreenIds: Set<string>
  firmName?: string
}

interface SidebarItem {
  id: string
  label: string
  module: AppMenuChild['module']
  icon: React.ReactNode
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeScreenId,
  onNavigate,
  visibleScreenIds,
  firmName = 'Sri Lakshmi Jewellers'
}) => {
  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      module: 'utility',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      id: 'item-master',
      label: 'Inventory',
      module: 'master',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    },
    {
      id: 'pos-billing',
      label: 'Sales',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    },
    {
      id: 'purchase-invoice',
      label: 'Purchase',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      )
    },
    {
      id: 'account-master',
      label: 'Customers',
      module: 'master',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      module: 'master',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
        </svg>
      )
    },
    {
      id: 'customer-orders',
      label: 'Orders',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    },
    {
      id: 'customer-quotation',
      label: 'Quotations',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    },
    {
      id: 'customer-advances',
      label: 'Advances',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      )
    },
    {
      id: 'consignment-hub',
      label: 'Consignments',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )
    },
    {
      id: 'repair-hub',
      label: 'Repairs',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )
    },
    {
      id: 'manufacturing-hub',
      label: 'Manufacturing',
      module: 'transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 20h20" />
          <path d="m5 20 5-16h4l5 16" />
          <path d="M7 14h10" />
        </svg>
      )
    },
    {
      id: 'account-balance',
      label: 'Accounts',
      module: 'reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      id: 'daily-summary-report',
      label: 'Reports',
      module: 'reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      id: 'gold-rates-settings',
      label: 'Gold & Silver Rates',
      module: 'utility',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3h12l4 6-10 13L2 9z" />
          <path d="M12 22V9" />
          <path d="m2 9 8 4 2-4 2 4 8-4" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      module: 'utility',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    }
  ]

  // Filter items based on access or home
  const visibleItems = sidebarItems.filter(
    (item) =>
      item.id === 'dashboard' ||
      item.id === 'suppliers' ||
      item.id === 'gold-rates-settings' ||
      visibleScreenIds.has(item.id)
  )

  const handleItemClick = (item: SidebarItem): void => {
    if (item.id === 'suppliers') {
      onNavigate('account-master', 'Supplier Master', 'master')
    } else if (item.id === 'gold-rates-settings') {
      onNavigate('settings', 'Gold & Silver Rates', 'utility')
    } else {
      onNavigate(item.id, item.label, item.module)
    }
  }

  return (
    <aside className="erp-app-sidebar">
      {/* Brand Identity */}
      <div className="erp-sidebar-brand">
        <div className="sidebar-brand-emblem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3h12l4 6-10 13L2 9z" />
            <path d="M12 22V9" />
            <path d="m2 9 8 4 2-4 2 4 8-4" />
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <h2 className="brand-title">{firmName}</h2>
          <span className="brand-tagline">TRUST IN EVERY ORNAMENT</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="erp-sidebar-nav" aria-label="Main Navigation">
        {visibleItems.map((item) => {
          const isActive =
            (item.id === 'dashboard' && activeScreenId === 'dashboard') ||
            item.id === activeScreenId ||
            (item.id === 'suppliers' && activeScreenId === 'account-master')

          return (
            <button
              key={item.id}
              type="button"
              className={`erp-sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom Showroom Decoration */}
      <div className="erp-sidebar-footer">
        <div className="sidebar-rings-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="9" cy="12" r="6" />
            <circle cx="15" cy="12" r="6" />
          </svg>
        </div>
        <div className="sidebar-footer-motto">
          <span>TRADITION</span>
          <span>MEETS TECHNOLOGY</span>
        </div>
      </div>
    </aside>
  )
}
