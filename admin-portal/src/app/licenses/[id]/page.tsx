'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import {
  Key,
  Laptop,
  Store,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  History,
  ChevronRight,
  Clock,
  ExternalLink,
  X,
  Cpu,
  Layers,
  Lock
} from 'lucide-react'

export default function LicenseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const licenseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    license: any
    shop: any
    auditLogs: any[]
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successToast, setSuccessToast] = useState('')

  // Dialog States
  const [showResetMachineModal, setShowResetMachineModal] = useState(false)
  const [resetReason, setResetReason] = useState('Hardware replacement requested by showroom owner')
  const [showStatusModal, setShowStatusModal] = useState<null | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'>(null)
  const [statusReason, setStatusReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadLicenseData = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getLicenseById(licenseId)
      if (res.success) {
        setData(res)
      } else {
        setErrorMessage('Failed to load license details.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (licenseId) loadLicenseData()
  }, [licenseId])

  // Handle Machine Reset
  const confirmResetMachine = async () => {
    try {
      setActionLoading(true)
      const res = await adminApi.resetMachineBinding(licenseId, resetReason)
      if (res.success) {
        setShowResetMachineModal(false)
        setSuccessToast('Machine hardware binding cleared. License is now unbound and available for a new workstation.')
        loadLicenseData()
      }
    } catch (err: any) {
      alert(`Machine reset failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle License Status Change
  const confirmStatusChange = async () => {
    if (!showStatusModal) return
    try {
      setActionLoading(true)
      const res = await adminApi.updateLicenseStatus(licenseId, showStatusModal, statusReason)
      if (res.success) {
        setShowStatusModal(null)
        setSuccessToast(`License status updated to ${showStatusModal}.`)
        loadLicenseData()
      }
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Product License Management" />
        <main className="p-8 max-w-6xl mx-auto text-slate-400 text-xs">
          Loading license details and machine binding telemetry...
        </main>
      </DashboardLayout>
    )
  }

  if (!data?.license) {
    return (
      <DashboardLayout>
        <Header title="Product License Management" />
        <main className="p-8 max-w-6xl mx-auto space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {errorMessage || 'License record not found.'}
          </div>
          <Link href="/licenses" className="text-xs text-amber-600 font-bold hover:underline">
            &larr; Return to License Management
          </Link>
        </main>
      </DashboardLayout>
    )
  }

  const { license, shop, auditLogs } = data
  const isRevoked = license.status === 'REVOKED'
  const isExpired = license.status === 'EXPIRED'

  return (
    <DashboardLayout>
      <Header title={`License: ${license.productKeyMasked || license._id}`} />

      <main className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/licenses" className="hover:text-amber-600 transition-colors">
            License Management
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold font-mono">
            {license.productKeyMasked || license._id}
          </span>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast('')} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: License Information */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" />
                License Information
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  license.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : license.status === 'AVAILABLE'
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : license.status === 'SUSPENDED'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : license.status === 'EXPIRED'
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {license.status}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Masked Product Key</span>
                <span className="font-mono font-bold text-sky-900 text-sm">{license.productKeyMasked}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Edition Tier</span>
                <span className="font-bold text-slate-900">{license.edition} Suite</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Machine Quota</span>
                <span className="text-slate-700 font-semibold">{license.maxAllowedMachines || 1} Workstation Terminal</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Validity Expiration</span>
                <span className="text-slate-700">
                  {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Perpetual Lifetime'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Issued Date</span>
                <span className="text-slate-600">{new Date(license.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Workstation Machine Binding */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-amber-600" />
                Workstation Binding
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  license.boundMachineId
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {license.boundMachineId ? 'Locked to PC' : 'Unbound'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Bound Machine Identifier</span>
                <span className="font-mono font-bold text-slate-900 break-all">
                  {license.boundMachineId || 'None (Ready for first terminal activation)'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Initial Activation Date</span>
                <span className="text-slate-700">
                  {license.activatedAt ? new Date(license.activatedAt).toLocaleString() : 'Not yet activated'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Activation Events</span>
                <span className="font-semibold text-slate-900">{license.activations?.length || 0} Events Logged</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Binding Security Standard</span>
                <span className="text-emerald-700 font-semibold">Ed25519 Hardware Signature</span>
              </div>
            </div>
          </div>

          {/* Card 3: Associated Showroom */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-600" />
                Associated Showroom
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  shop?.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {shop?.status || 'N/A'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Showroom Name</span>
                <span className="font-bold text-slate-900">{shop?.shopName || license.firmName || 'N/A'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Node ID</span>
                <span className="font-mono font-bold text-amber-600">{shop?.shopId || 'N/A'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Owner Username</span>
                <span className="font-mono text-slate-700">{shop?.ownerAccountId?.username || 'N/A'}</span>
              </div>

              {shop?._id && (
                <div className="pt-2">
                  <Link
                    href={`/owners/${shop.ownerAccountId?._id || ''}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    <span>View Owner Account</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Administrative Action Hub */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Machine Binding &amp; Lifecycle Controls
            </h3>
            <p className="text-xs text-slate-500">
              Manage workstation device bindings and cryptographic license entitlement states.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Action 1: Reset Machine Binding */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Laptop className="w-4 h-4 text-amber-600" />
                  Reset Workstation Machine Binding
                </div>
                {license.boundMachineId ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Currently Bound
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Already Unbound
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Authorizes hardware transfer or replacement. Clears bound machine ID while preserving complete activation history.
              </p>
              <button
                type="button"
                disabled={!license.boundMachineId || isRevoked || isExpired}
                onClick={() => setShowResetMachineModal(true)}
                className="w-full h-9 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Reset Machine Binding
              </button>
            </div>

            {/* Action 2: License Status Controls */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-slate-700" />
                  License Status Controls
                </div>
                <span className="text-[10px] font-bold text-slate-700">
                  Current: {license.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Control commercial entitlement. Suspended licenses cannot be verified by client terminals.
              </p>
              <div className="flex items-center gap-2">
                {license.status !== 'ACTIVE' && license.status !== 'AVAILABLE' && (
                  <button
                    type="button"
                    disabled={isRevoked || isExpired || shop?.status === 'SUSPENDED' || shop?.status === 'ARCHIVED'}
                    onClick={() => setShowStatusModal('ACTIVE')}
                    className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                  >
                    Reactivate
                  </button>
                )}
                {license.status !== 'SUSPENDED' && (
                  <button
                    type="button"
                    disabled={isRevoked || isExpired}
                    onClick={() => setShowStatusModal('SUSPENDED')}
                    className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                  >
                    Suspend
                  </button>
                )}
                {license.status !== 'REVOKED' && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal('REVOKED')}
                    className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activation History Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Workstation Activation History ({license.activations?.length || 0} events)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">
              Preserved across machine resets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Machine Identifier (Hardware Hash)</th>
                  <th className="py-3 px-6">IP Address</th>
                  <th className="py-3 px-6">App Version</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!license.activations || license.activations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No terminal activations recorded yet.
                    </td>
                  </tr>
                ) : (
                  license.activations.map((act: any, idx: number) => {
                    const isCurrent = act.machineId === license.boundMachineId
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-6 text-slate-500 font-mono text-[11px]">
                          {new Date(act.activatedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-6">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            {act.machineId}
                          </div>
                        </td>
                        <td className="py-3 px-6 text-slate-600 font-mono text-[11px]">
                          {act.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3 px-6 text-slate-600">
                          {act.appVersion || '1.0.0'}
                        </td>
                        <td className="py-3 px-6">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Active Bound PC
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-medium">
                              Previous / Historic
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Audit Log Trail */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              License Audit Trail ({auditLogs?.length || 0} events)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Actor</th>
                  <th className="py-3 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!auditLogs || auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No audit events recorded for this license.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-6 text-slate-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-6 font-semibold text-slate-900">
                        {log.action}
                      </td>
                      <td className="py-3 px-6 font-semibold text-slate-700">
                        {log.adminUsername || 'System'}
                      </td>
                      <td className="py-3 px-6 text-slate-500 text-[11px]">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CONFIRMATION MODAL: RESET MACHINE BINDING */}
        {showResetMachineModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="text-base font-bold text-slate-900">Confirm Machine Reset</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to release the hardware lock on computer{' '}
                <strong className="font-mono text-slate-900 block mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {license.boundMachineId}
                </strong>
                <br />
                This will transition the license to <strong>AVAILABLE</strong> and allow the showroom to activate a replacement workstation. All historical telemetry is preserved.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Administrative Reason
                </label>
                <input
                  type="text"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowResetMachineModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={confirmResetMachine}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
                >
                  {actionLoading ? 'Resetting...' : 'Yes, Reset Binding'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL: LICENSE STATUS CHANGE */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="text-base font-bold text-slate-900">
                  Confirm License Status Transition to {showStatusModal}
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {showStatusModal === 'SUSPENDED' && (
                  <>
                    Suspending this license will prevent the terminal from validating sessions and performing future activations.
                  </>
                )}
                {showStatusModal === 'REVOKED' && (
                  <strong className="text-rose-600 block">
                    Revoking a license is permanent and irreversible. The showroom will lose all commercial ERP entitlements under this product key.
                  </strong>
                )}
                {showStatusModal === 'ACTIVE' && (
                  <>
                    Reactivating will restore valid entitlement state.
                  </>
                )}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Administrative Reason (Optional)
                </label>
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Authorized customer support ticket #982"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowStatusModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={confirmStatusChange}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-sm ${
                    showStatusModal === 'REVOKED'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : showStatusModal === 'SUSPENDED'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionLoading ? 'Updating...' : `Confirm ${showStatusModal}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}