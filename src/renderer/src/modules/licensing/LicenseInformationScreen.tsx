import React, { useEffect, useState } from 'react'
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiCpu,
  FiHardDrive,
  FiLock,
  FiRefreshCw,
  FiShield,
  FiX
} from 'react-icons/fi'
import { formatDatePretty } from '../../utils/formatters'

type Props = {
  onClose: () => void
}

type FeatureCategory = 'core' | 'operations' | 'enterprise'

interface FeatureDetail {
  id: LicenseFeature
  label: string
  desc: string
  category: FeatureCategory
}

const FEATURE_CATALOG: FeatureDetail[] = [
  // Core Trading & Billing
  {
    id: 'FEATURE_SALES',
    label: 'Wholesale & Retail Sales',
    desc: 'POS billing, gross/net weight hishob, fine metal credit & instant invoices',
    category: 'core'
  },
  {
    id: 'FEATURE_PURCHASE',
    label: 'Purchase & Metal Inward',
    desc: 'Bullion purchase entries, scrap exchange receipts, vendor purity vouchers',
    category: 'core'
  },
  {
    id: 'FEATURE_INVENTORY',
    label: 'Live Stock & Vault Control',
    desc: 'Real-time item master, purity carats (18K/22K/24K), stone weight tracking',
    category: 'core'
  },
  {
    id: 'FEATURE_ACCOUNTING',
    label: 'Financial Accounting & Ledgers',
    desc: 'Double-entry ledgers, daily cash/bank book, karigar loss hishob, journal entries',
    category: 'core'
  },
  {
    id: 'FEATURE_GST',
    label: 'GST Returns & Compliance',
    desc: 'GSTR-1, GSTR-3B tax split, e-way bill readiness, CGST/SGST/IGST reports',
    category: 'core'
  },
  {
    id: 'FEATURE_BARCODE',
    label: 'Thermal Jewellery Tag Printing',
    desc: 'Support for TSC/Zebra thermal jewelry barcode labels, rat/purity tags',
    category: 'core'
  },

  // Operations & Workshop
  {
    id: 'FEATURE_JOB_WORK',
    label: 'Karigar Job Work & Melters',
    desc: 'Issue gold to smiths, metal loss/wastage tracking, pure return reconciliation',
    category: 'operations'
  },
  {
    id: 'FEATURE_APPROVALS',
    label: 'Approval & Jangad System',
    desc: 'Wholesale and retail goods on approval, return receipts, conversion to sale',
    category: 'operations'
  },
  {
    id: 'FEATURE_ORDERS',
    label: 'Customer Custom Orders Desk',
    desc: 'Custom jewelry design bookings, advance receipts, delivery schedules',
    category: 'operations'
  },
  {
    id: 'FEATURE_REPORTS',
    label: 'Executive & Audit Reports',
    desc: 'Party statements, stock valuation, outstanding aging, fine balance summaries',
    category: 'operations'
  },

  // Advanced & Enterprise
  {
    id: 'FEATURE_ADVANCED_REPORTS',
    label: 'Advanced Profit & City Analytics',
    desc: 'Fine margin analysis, city-wise sales heatmaps, customer purchase frequency',
    category: 'enterprise'
  },
  {
    id: 'FEATURE_CONSIGNMENT',
    label: 'Vendor Consignment & Exhibition Hub',
    desc: 'Exhibition memos, vendor consignment settlements, stock on loan',
    category: 'enterprise'
  },
  {
    id: 'FEATURE_MANUFACTURING',
    label: 'In-House Casting & Manufacturing',
    desc: 'Alloy melting batches, casting loss calculation, multi-stage production runs',
    category: 'enterprise'
  },
  {
    id: 'FEATURE_TAGGING_RFID',
    label: 'High-Speed RFID Tray Audit',
    desc: 'Simultaneous 100-item RFID scanning, tray verification, anti-theft audits',
    category: 'enterprise'
  }
]

function LicenseInformationScreen({ onClose }: Props): React.JSX.Element {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [machineId, setMachineId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState<'license' | 'machine' | null>(null)

  const loadLicenseData = (): void => {
    setLoading(true)
    Promise.all([window.api.license.getInfo(), window.api.license.getMachineId()])
      .then(([info, mid]) => {
        setLicenseInfo(info)
        setMachineId(mid)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadLicenseData()
  }, [])

  const handleCopy = (text: string, type: 'license' | 'machine'): void => {
    navigator.clipboard.writeText(text)
    setCopiedKey(type)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const edition = licenseInfo?.edition || 'PROFESSIONAL'
  const isEnterprise = edition === 'ENTERPRISE'
  const isBasic = edition === 'BASIC'

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 px-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-sm font-bold">
            <FiAward className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-slate-900 tracking-tight">License & Subscription</h1>
            
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Commercial Software Entitlement, Machine Device Lock & Module Features
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadLicenseData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Verifying...' : 'Re-verify'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close Tab"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* Luxury Hero Edition Banner */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-8">
          {/* Subtle Golden Glow Effects */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start md:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-md flex-shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 text-3xl">
                  <FiAward />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl md:text-2xl font-black tracking-tight text-white">
                    Jewellery ERP {edition}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      licenseInfo?.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    ● {licenseInfo?.status || 'Active'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">License ID:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {licenseInfo?.licenseId || 'LIC-LOCAL-DEV'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(licenseInfo?.licenseId || '', 'license')}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                      title="Copy License ID"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                    </button>
                    {copiedKey === 'license' && (
                      <span className="text-[10px] font-bold text-emerald-400">Copied!</span>
                    )}
                  </div>

                  <span className="text-slate-600 hidden md:inline">•</span>

                  <div className="text-slate-300">
                    Registered Firm: <span className="font-semibold text-white">{licenseInfo?.firmName || 'Jewellery Showroom'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Security Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FiShield className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Ed25519 Cryptographic Proof</span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  DPAPI Encrypted · Hardware Bound
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metrics & Entitlement Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Bound Computer Device */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Bound Computer ID</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FiCpu className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70 flex items-center justify-between">
                <span className="truncate">{machineId || licenseInfo?.machineId || 'DESKTOP-NODE'}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(machineId || licenseInfo?.machineId || '', 'machine')}
                  className="text-slate-400 hover:text-indigo-600 transition-colors ml-1.5 shrink-0"
                  title="Copy Machine ID"
                >
                  <FiCopy className="w-3.5 h-3.5" />
                </button>
              </div>
              {copiedKey === 'machine' && (
                <div className="text-[10px] font-bold text-emerald-600 mt-1">Machine ID copied to clipboard!</div>
              )}
            </div>
          </div>

          {/* Card 2: Activated Date */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Activation Date</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <FiClock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {formatDatePretty(licenseInfo?.activatedAt)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Initial hardware registration</p>
            </div>
          </div>

          {/* Card 3: Expiry Date / Remaining */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Validity Period</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <FiClock className="w-4 h-4" />
              </div>
            </div>
            <div>
              {licenseInfo?.expiresAt ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      {formatDatePretty(licenseInfo.expiresAt)}
                    </span>
                  </div>
                  {licenseInfo.daysRemaining !== null && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                      {licenseInfo.daysRemaining} days remaining
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-emerald-700">Perpetual License</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Lifetime commercial validity</p>
                </>
              )}
            </div>
          </div>

          {/* Card 4: Operating Mode */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Network Mode</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <FiHardDrive className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>100% Offline Ready</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Zero daily online telemetry</p>
            </div>
          </div>
        </div>

        {/* Feature Entitlements Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Licensed Feature Entitlements
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive module access matrix for Jewellery ERP {edition}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {licenseInfo?.features.length || 0} / {FEATURE_CATALOG.length} Modules Active
              </span>
            </div>
          </div>

          {/* Group 1: Core Trading & Retail */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Core Trading & Accounts
              </span>
              <div className="flex-1 border-t border-slate-100" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURE_CATALOG.filter((f) => f.category === 'core').map((feature) => {
                const isEnabled = licenseInfo?.features.includes(feature.id) ?? true
                return (
                  <div
                    key={feature.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      isEnabled
                        ? 'bg-slate-50/80 border-slate-200/90 text-slate-900 shadow-2xs'
                        : 'bg-slate-50/30 border-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className={`mt-0.5 ${isEnabled ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {isEnabled ? <FiCheckCircle className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold leading-tight truncate">{feature.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Group 2: Workshop & Karigar Operations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Workshop, Orders & Audit Operations
              </span>
              <div className="flex-1 border-t border-slate-100" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURE_CATALOG.filter((f) => f.category === 'operations').map((feature) => {
                const isEnabled = licenseInfo?.features.includes(feature.id) ?? (isEnterprise || !isBasic)
                return (
                  <div
                    key={feature.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      isEnabled
                        ? 'bg-slate-50/80 border-slate-200/90 text-slate-900 shadow-2xs'
                        : 'bg-slate-50/30 border-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className={`mt-0.5 ${isEnabled ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {isEnabled ? <FiCheckCircle className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold leading-tight truncate">{feature.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Group 3: Enterprise & RFID Hubs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enterprise Consignment, RFID & Manufacturing
              </span>
              <div className="flex-1 border-t border-slate-100" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURE_CATALOG.filter((f) => f.category === 'enterprise').map((feature) => {
                const isEnabled = licenseInfo?.features.includes(feature.id) ?? isEnterprise
                return (
                  <div
                    key={feature.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      isEnabled
                        ? 'bg-amber-50/40 border-amber-200/80 text-slate-900 shadow-2xs'
                        : 'bg-slate-50/30 border-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className={`mt-0.5 ${isEnabled ? 'text-amber-600' : 'text-slate-300'}`}>
                      {isEnabled ? <FiCheckCircle className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold leading-tight truncate">{feature.label}</h4>
                        {isEnabled && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            ENT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default LicenseInformationScreen
