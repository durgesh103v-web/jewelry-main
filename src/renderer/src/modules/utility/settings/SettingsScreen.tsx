import React, { useEffect, useMemo, useState } from 'react'
import {
  FiAlertTriangle,
  FiArrowRight,
  FiAward,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCpu,
  FiDatabase,
  FiHardDrive,
  FiLock,
  FiPrinter,
  FiSearch,
  FiSettings,
  FiTag,
  FiTrash2,
  FiX
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import type { AppMenuChild } from '../../../types/menu'

type SettingsItem = {
  id: string
  label: string
  description: string
  category: 'FIRM' | 'HARDWARE' | 'SECURITY' | 'UTILITY'
  module: AppMenuChild['module']
  icon: React.ReactNode
  iconBg: string
  badge?: string
}

const SETTINGS_CATALOG: SettingsItem[] = [
  // Business Profile & Fiscal Setup
  {
    id: 'firm-master',
    label: 'Firm Master',
    description: 'Configure showroom name, address, GSTIN, PAN, and header branding.',
    category: 'FIRM',
    module: 'master',
    icon: <FiBriefcase className="w-5 h-5 text-amber-700" />,
    iconBg: 'bg-amber-100 border-amber-200'
  },
  {
    id: 'financial-year',
    label: 'Financial Year',
    description: 'Manage fiscal periods, set active billing year, and year-end closures.',
    category: 'FIRM',
    module: 'utility',
    icon: <FiCalendar className="w-5 h-5 text-emerald-700" />,
    iconBg: 'bg-emerald-100 border-emerald-200'
  },

  // Printing & Hardware Peripherals
  {
    id: 'printer-setting',
    label: 'Printer & Bill Settings',
    description: 'Configure Laser A4, Thermal POS 80mm/58mm rolls, margins, and invoice formats.',
    category: 'HARDWARE',
    module: 'utility',
    icon: <FiPrinter className="w-5 h-5 text-blue-700" />,
    iconBg: 'bg-blue-100 border-blue-200'
  },
  {
    id: 'barcode-printing',
    label: 'Barcode Tag Printing',
    description: 'Jewelry barcode label printer setup, tag dimensions, and batch generator.',
    category: 'HARDWARE',
    module: 'utility',
    icon: <FiTag className="w-5 h-5 text-indigo-700" />,
    iconBg: 'bg-indigo-100 border-indigo-200'
  },
  {
    id: 'jewellery-tagging-hub',
    label: 'RFID & Tagging Hub',
    description: 'RFID tag encoding, USB barcode scanners, and live stock take audit console.',
    category: 'HARDWARE',
    module: 'utility',
    icon: <FiCpu className="w-5 h-5 text-purple-700" />,
    iconBg: 'bg-purple-100 border-purple-200',
    badge: 'Hardware Hub'
  },

  // Security & Data Protection
  {
    id: 'license-info',
    label: 'License & Subscription',
    description: 'View commercial license status, bound computer ID, expiry dates, and feature entitlements.',
    category: 'SECURITY',
    module: 'utility',
    icon: <FiAward className="w-5 h-5 text-amber-700" />,
    iconBg: 'bg-amber-100 border-amber-200',
    badge: 'Offline Ready'
  },
  {
    id: 'change-password',
    label: 'Change Password',
    description: 'Update administrator credentials, security keys, and access passwords.',
    category: 'SECURITY',
    module: 'utility',
    icon: <FiLock className="w-5 h-5 text-rose-700" />,
    iconBg: 'bg-rose-100 border-rose-200'
  },
  {
    id: 'backup',
    label: 'Backup & Restore',
    description: 'Create encrypted offline database backups and disaster recovery restores.',
    category: 'SECURITY',
    module: 'utility',
    icon: <FiDatabase className="w-5 h-5 text-teal-700" />,
    iconBg: 'bg-teal-100 border-teal-200'
  },
  {
    id: 'delete-sale-bills',
    label: 'Delete Sale Bills',
    description: 'Restricted administrative audit utility to safely purge or void sales bills.',
    category: 'SECURITY',
    module: 'reports',
    icon: <FiTrash2 className="w-5 h-5 text-rose-600" />,
    iconBg: 'bg-rose-50 border-rose-200',
    badge: 'Admin Only'
  },

  // Communication & Productivity
  {
    id: 'whatsapp',
    label: 'WhatsApp Quick Dispatch',
    description: 'Send payment reminders, invoice copies, and festival greetings to customers.',
    category: 'UTILITY',
    module: 'utility',
    icon: <FaWhatsapp className="w-5 h-5 text-emerald-600" />,
    iconBg: 'bg-emerald-50 border-emerald-200'
  },
  {
    id: 'reminder',
    label: 'Payment & Approval Reminders',
    description: 'Track upcoming customer return deadlines, due dates, and overdue follow-ups.',
    category: 'UTILITY',
    module: 'utility',
    icon: <FiBell className="w-5 h-5 text-amber-600" />,
    iconBg: 'bg-amber-50 border-amber-200'
  },
  {
    id: 'screenshot',
    label: 'Screenshots & Visual Audits',
    description: 'Review, inspect, and manage system screenshot captures and visual logs.',
    category: 'UTILITY',
    module: 'utility',
    icon: <FiCamera className="w-5 h-5 text-slate-700" />,
    iconBg: 'bg-slate-100 border-slate-200'
  }
]

function SettingsScreen({
  onClose,
  onNavigate
}: {
  onClose: () => void
  onNavigate: (id: string, label: string, module: AppMenuChild['module']) => void
}): React.JSX.Element {
  const [searchText, setSearchText] = useState('')
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [activeFy, setActiveFy] = useState<string>('2026-27')
  const [lastBackup, setLastBackup] = useState<string>('No recent backup')

  useEffect(() => {
    window.api.firm
      .get()
      .then((f) => setFirm(f))
      .catch(() => {})

    window.api.financialYears
      .list()
      .then((fys) => {
        const curr = (fys || []).find((y) => y.isCurrent)
        if (curr) setActiveFy(curr.yearLabel)
      })
      .catch(() => {})

    window.api.backup
      .getLast()
      .then((b) => {
        if (b?.backupAt) setLastBackup(b.backupAt)
      })
      .catch(() => {})
  }, [])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return SETTINGS_CATALOG

    return SETTINGS_CATALOG.filter(
      (item) =>
        item.label.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword)
    )
  }, [searchText])

  const categorizedGroups = useMemo(() => {
    return [
      {
        title: 'Business Profile & Fiscal Setup',
        subtitle: 'Showroom identity, registration numbers, and financial accounting years',
        items: filteredItems.filter((i) => i.category === 'FIRM')
      },
      {
        title: 'Printing, Hardware & Barcode Engines',
        subtitle: 'Bill paper layouts, barcode tagging, and RFID scanner integration',
        items: filteredItems.filter((i) => i.category === 'HARDWARE')
      },
      {
        title: 'Security, Access & Data Protection',
        subtitle: 'User authentication, offline backups, and sensitive audit maintenance',
        items: filteredItems.filter((i) => i.category === 'SECURITY')
      },
      {
        title: 'Customer Communication & Productivity',
        subtitle: 'WhatsApp customer outreach, payment reminders, and screen captures',
        items: filteredItems.filter((i) => i.category === 'UTILITY')
      }
    ].filter((group) => group.items.length > 0)
  }, [filteredItems])

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiSettings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Settings & Control Center</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                System Ready · v1.0.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Central management hub for firm profile, hardware printers, security access, and backups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Filter Input */}
          <div className="relative w-64">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search settings..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                type="button"
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                onClick={() => setSearchText('')}
              >
                &times;
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Scroll Area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* System Environment & Health Diagnostic Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Active Firm Showroom
              </span>
              <strong className="text-xs font-bold text-slate-900 block mt-0.5 truncate max-w-[160px]" title={firm?.firmName || 'Shree Ganesh Jewellers'}>
                {firm?.firmName || 'Shree Ganesh Jewellers'}
              </strong>
              <span className="text-[10px] text-slate-500 font-mono">
                GST: {firm?.gstNo || 'Not configured'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
              <FiBriefcase className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Current Fiscal Year
              </span>
              <strong className="text-xs font-bold font-mono text-emerald-950 block mt-0.5">
                FY {activeFy}
              </strong>
              <span className="text-[10px] text-emerald-700 font-medium">
                Active Billing Period
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
              <FiCalendar className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                Database Engine
              </span>
              <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                SQLite 3 (WAL Mode)
              </strong>
              <span className="text-[10px] text-slate-500">
                Encrypted Local Storage
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0">
              <FiHardDrive className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                Last DB Backup
              </span>
              <strong className="text-xs font-bold font-mono text-slate-900 block mt-0.5 truncate max-w-[160px]" title={lastBackup}>
                {lastBackup}
              </strong>
              <span className="text-[10px] text-teal-700 font-medium">
                Disaster Recovery Ready
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
              <FiDatabase className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Categorized Settings Grid Hubs */}
        <div className="flex flex-col gap-5">
          {categorizedGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2.5">
              <div className="border-b border-slate-200/80 pb-1.5 flex items-baseline justify-between">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {group.title}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {group.subtitle}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  {group.items.length} Modules
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.id, item.label, item.module)}
                    className="group bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200/90 hover:border-amber-400 p-4 transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs ${item.iconBg}`}
                        >
                          {item.icon}
                        </div>
                        {item.badge ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {item.badge}
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-amber-500 group-hover:text-white text-slate-400 flex items-center justify-center text-xs transition-colors">
                            <FiArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-900 transition-colors">
                        {item.label}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-amber-700 group-hover:text-amber-800">
                      <span>Open Configuration</span>
                      <span className="font-mono text-xs">➔</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {categorizedGroups.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              <FiAlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-800">No matching settings found</h4>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for keywords like &quot;printer&quot;, &quot;firm&quot;, &quot;backup&quot;, or &quot;password&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsScreen
