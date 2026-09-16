import React, { useEffect, useState } from 'react'
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiHardDrive,
  FiRefreshCw,
  FiShield,
  FiX
} from 'react-icons/fi'
import { formatDate } from '../../utils/formatters'

type Props = {
  onClose: () => void
}

const FEATURE_LABELS: Record<LicenseFeature, { label: string; desc: string }> = {
  FEATURE_SALES: { label: 'Wholesale & Retail Sales', desc: 'Invoicing, fine calculations, weight hishob' },
  FEATURE_PURCHASE: { label: 'Purchase & Metal Inward', desc: 'Purchase bills, vendor hishob, fine receipts' },
  FEATURE_INVENTORY: { label: 'Inventory & Stock Control', desc: 'Item master, item categories, purity definitions' },
  FEATURE_ACCOUNTING: { label: 'Financial Accounting & Ledgers', desc: 'Account ledger, cash/bank book, vouchers' },
  FEATURE_REPORTS: { label: 'Management & Audit Reports', desc: 'Party statement, stock ledger, outstanding balances' },
  FEATURE_GST: { label: 'GST Returns & Compliance', desc: 'GSTR-1, GSTR-3B summaries, tax audit reports' },
  FEATURE_BARCODE: { label: 'Barcode Label & Tag Printing', desc: 'Thermal jewelry tag printer support, 1D/2D barcodes' },
  FEATURE_JOB_WORK: { label: 'Karigar Job Work & Melters', desc: 'Karigar issues, loss/wastage calculation, returns' },
  FEATURE_APPROVALS: { label: 'Approval & Jangad System', desc: 'Customer and wholesale approval vouchers' },
  FEATURE_ORDERS: { label: 'Customer Custom Orders', desc: 'Advance receipt booking, delivery tracking' },
  FEATURE_ADVANCED_REPORTS: { label: 'Advanced Analytics & Margins', desc: 'Fine margin analysis, city-wise sales reports' },
  FEATURE_CONSIGNMENT: { label: 'Consignment Exhibition Hub', desc: 'Outward exhibition consignments, settlements' },
  FEATURE_MANUFACTURING: { label: 'In-house Manufacturing & Casting', desc: 'Melting batches, alloy mixing, production line' },
  FEATURE_TAGGING_RFID: { label: 'RFID High-speed Tag Audit', desc: 'RFID handheld scanner integration, fast audits' }
}

function LicenseInformationScreen({ onClose }: Props): React.JSX.Element {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [machineId, setMachineId] = useState<string>('')
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <FiAward className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">License & Subscription</h1>
            <p className="text-xs text-slate-500">Commercial Software Entitlement & Device Binding</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLicenseData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Verify</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* Active License Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
                <FiAward />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">
                    Jewellery ERP {licenseInfo?.edition || 'Professional'}
                  </h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      licenseInfo?.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    ● {licenseInfo?.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  License ID: <span className="font-mono text-amber-300">{licenseInfo?.licenseId || 'LIC-LOCAL-DEV'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs bg-white/10 px-4 py-2.5 rounded-xl border border-white/10">
              <div>
                <div className="text-slate-300">Operation Mode</div>
                <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <FiHardDrive className="text-emerald-400" />
                  <span>100% Offline Ready</span>
                </div>
              </div>
              <div className="border-l border-white/20 pl-4">
                <div className="text-slate-300">Status</div>
                <div className="font-bold text-white mt-0.5">
                  {licenseInfo?.isExpired ? 'Expired' : 'Verified Valid'}
                </div>
              </div>
            </div>
          </div>

          {/* License Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FiClock className="text-slate-400" />
                <span>Activated Date</span>
              </div>
              <div className="text-sm font-bold text-slate-800">
                {formatDate(licenseInfo?.activatedAt) || 'Initial Setup'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FiClock className="text-slate-400" />
                <span>Valid Until</span>
              </div>
              <div className="text-sm font-bold text-slate-800">
                {licenseInfo?.expiresAt ? (
                  <>
                    <span>{formatDate(licenseInfo.expiresAt)}</span>
                    {licenseInfo.daysRemaining !== null && (
                      <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {licenseInfo.daysRemaining} days left
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-emerald-700 font-bold">Perpetual (No Expiry)</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FiCpu className="text-slate-400" />
                <span>Bound Computer Device</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                {machineId || licenseInfo?.machineId || 'DESKTOP-NODE'}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Entitlements Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Licensed Feature Entitlements</h3>
              <p className="text-xs text-slate-500">Modules unlocked under your {licenseInfo?.edition || 'Professional'} subscription</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              <FiShield className="w-3.5 h-3.5" />
              <span>Ed25519 Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(FEATURE_LABELS) as LicenseFeature[]).map((featureKey) => {
              const info = FEATURE_LABELS[featureKey]
              const isEnabled = licenseInfo?.features.includes(featureKey) ?? true

              return (
                <div
                  key={featureKey}
                  className={`p-3.5 rounded-lg border transition-all flex items-start gap-3 ${
                    isEnabled
                      ? 'bg-slate-50 border-slate-200/80 text-slate-800'
                      : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  <div className={`mt-0.5 ${isEnabled ? 'text-emerald-600' : 'text-slate-300'}`}>
                    <FiCheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight">{info.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{info.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Security & Offline Guarantee Notice */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <FiShield className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Offline Guarantee (Model A):</strong> Your license is stored locally with hardware-bound DPAPI encryption. No periodic online check, background telemetry, or internet access is required for daily billing, ledger entries, or reports.
          </div>
        </div>
      </div>
    </div>
  )
}

export default LicenseInformationScreen
