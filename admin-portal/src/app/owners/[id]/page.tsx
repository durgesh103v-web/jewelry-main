'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import {
  Users,
  Store,
  Key,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Copy,
  ChevronRight,
  Clock,
  Lock,
  History,
  Laptop,
  Check,
  X
} from 'lucide-react'

export default function OwnerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const ownerId = params.id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    owner: any
    shop: any
    license: any
    auditLogs: any[]
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successToast, setSuccessToast] = useState('')

  // Dialog States
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState<null | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // One-time credential reveal states (NOT stored in local/sessionStorage)
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null)
  const [revealedRecoveryKey, setRevealedRecoveryKey] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const loadOwnerData = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getOwnerById(ownerId)
      if (res.success) {
        setData(res)
      } else {
        setErrorMessage('Failed to retrieve owner details.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ownerId) loadOwnerData()
  }, [ownerId])

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Handle Reset Temporary Password
  const confirmPasswordReset = async () => {
    try {
      setActionLoading(true)
      const res = await adminApi.resetOwnerPassword(ownerId)
      if (res.success) {
        setShowPasswordModal(false)
        setRevealedPassword(res.temporaryPassword)
        setSuccessToast('Temporary password has been regenerated successfully.')
        loadOwnerData()
      }
    } catch (err: any) {
      alert(`Password reset failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Rotate Recovery Key
  const confirmRecoveryKeyRotation = async () => {
    try {
      setActionLoading(true)
      const res = await adminApi.rotateOwnerRecoveryKey(ownerId)
      if (res.success) {
        setShowRecoveryModal(false)
        setRevealedRecoveryKey(res.recoveryKey)
        setSuccessToast('Master recovery key rotated successfully.')
        loadOwnerData()
      }
    } catch (err: any) {
      alert(`Key rotation failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Shop Status Toggle
  const confirmStatusChange = async () => {
    if (!showStatusModal || !data?.shop?._id) return
    try {
      setActionLoading(true)
      const res = await adminApi.updateShopStatus(data.shop._id, showStatusModal)
      if (res.success) {
        setShowStatusModal(null)
        setSuccessToast(`Shop showroom status updated to ${showStatusModal}.`)
        loadOwnerData()
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
        <Header title="Owner Credentials &amp; Security" />
        <main className="p-8 max-w-6xl mx-auto text-slate-400 text-xs">
          Loading owner account security profile...
        </main>
      </DashboardLayout>
    )
  }

  if (!data?.owner) {
    return (
      <DashboardLayout>
        <Header title="Owner Credentials &amp; Security" />
        <main className="p-8 max-w-6xl mx-auto space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {errorMessage || 'Owner account not found.'}
          </div>
          <Link href="/owners" className="text-xs text-amber-600 font-bold hover:underline">
            &larr; Return to Owner Accounts
          </Link>
        </main>
      </DashboardLayout>
    )
  }

  const { owner, shop, license, auditLogs } = data

  return (
    <DashboardLayout>
      <Header title={`Owner Security: ${owner.username}`} />

      <main className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/owners" className="hover:text-amber-600 transition-colors">
            Owner Accounts
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">{owner.username}</span>
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

        {/* REVEALED TEMPORARY PASSWORD MODAL (One-Time Display) */}
        {revealedPassword && (
          <div className="p-6 bg-amber-50/70 border-2 border-amber-300 rounded-2xl space-y-4 shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-600" />
                Newly Issued Temporary Password (One-Time Reveal)
              </div>
              <button
                onClick={() => setRevealedPassword(null)}
                className="text-amber-800 hover:text-amber-950 font-bold text-xs"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-amber-800">
              Provide this temporary password to the showroom owner. The previous password has been immediately invalidated in MongoDB. The owner will be required to change this upon terminal sign-in.
            </p>
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-amber-200">
              <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">
                {revealedPassword}
              </span>
              <button
                onClick={() => handleCopy(revealedPassword, 'TEMP_PASSWORD')}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedField === 'TEMP_PASSWORD' ? 'Copied' : 'Copy Password'}</span>
              </button>
            </div>
          </div>
        )}

        {/* REVEALED MASTER RECOVERY KEY MODAL (One-Time Display) */}
        {revealedRecoveryKey && (
          <div className="p-6 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl space-y-4 shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Key className="w-4 h-4 text-emerald-600" />
                Newly Rotated Master Recovery Key (One-Time Reveal)
              </div>
              <button
                onClick={() => setRevealedRecoveryKey(null)}
                className="text-emerald-800 hover:text-emerald-950 font-bold text-xs"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-emerald-800">
              The previous recovery key hash has been permanently replaced with SHA-256 hash. Store this plaintext key securely in the master physical safe.
            </p>
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-emerald-200">
              <span className="font-mono font-bold text-emerald-900 text-sm tracking-wider">
                {revealedRecoveryKey}
              </span>
              <button
                onClick={() => handleCopy(revealedRecoveryKey, 'RECOVERY_KEY')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedField === 'RECOVERY_KEY' ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Primary Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Owner Identity & Provisioning */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                Owner Identity
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  owner.isProvisioned
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {owner.isProvisioned ? 'Provisioned' : 'Pending Activation'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Username</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{owner.username}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Password Status</span>
                {owner.isTemporaryPassword ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    Temporary (First login change required)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Permanent Password Active
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Provisioned Device ID</span>
                <span className="font-mono text-slate-700">
                  {owner.provisionedMachineId || 'None (Awaiting first terminal setup)'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Registered On</span>
                <span className="text-slate-600">{new Date(owner.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Showroom Profile */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-600" />
                Showroom Profile
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  shop?.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : shop?.status === 'SUSPENDED'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {shop?.status || 'UNKNOWN'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Shop Name</span>
                <span className="font-bold text-slate-900">{shop?.shopName || 'N/A'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Node ID</span>
                <span className="font-mono font-bold text-amber-600">{shop?.shopId || owner.shopIdentifier}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Proprietor Name</span>
                <span className="text-slate-700">{shop?.ownerName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone / Email</span>
                <span className="text-slate-700">
                  {shop?.phone} {shop?.email ? `• ${shop.email}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Licensing & Workstation Binding */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" />
                Product Licensing
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {license?.edition || shop?.edition || 'PROFESSIONAL'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Masked Product Key</span>
                <span className="font-mono font-bold text-slate-900">{license?.productKeyMasked || 'N/A'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">License Status</span>
                <span className="font-semibold text-slate-700">{license?.status || 'N/A'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Bound Workstation Machine</span>
                <span className="font-mono text-slate-700">
                  {license?.boundMachineId || 'Unbound (Awaiting initial PC activation)'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Validity Expiration</span>
                <span className="text-slate-600">
                  {license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Perpetual Lifetime'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Credential Action Hub */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Administrative Security &amp; Credential Actions
              </h3>
              <p className="text-xs text-slate-500">
                Execute controlled credential resets and showroom lifecycle status modifications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Action 1: Temporary Password Reset */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Lock className="w-4 h-4 text-amber-600" />
                Reset Temporary Password
              </div>
              <p className="text-[11px] text-slate-500">
                Generates a new Argon2id temporary password and immediately invalidates the previous credential.
              </p>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Reset Password
              </button>
            </div>

            {/* Action 2: Master Recovery Key Rotation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Key className="w-4 h-4 text-emerald-600" />
                Rotate Master Recovery Key
              </div>
              <p className="text-[11px] text-slate-500">
                Rotates the 16-character offline recovery string for lost password scenarios. Replaces SHA-256 hash.
              </p>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(true)}
                className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Rotate Recovery Key
              </button>
            </div>

            {/* Action 3: Shop Status Controls */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldAlert className="w-4 h-4 text-slate-700" />
                Showroom Lifecycle Status
              </div>
              <p className="text-[11px] text-slate-500">
                Current: <strong className="text-slate-800">{shop?.status}</strong>. Suspending halts client activation and provisioning.
              </p>
              <div className="flex items-center gap-2">
                {shop?.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal('ACTIVE')}
                    className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Reactivate
                  </button>
                )}
                {shop?.status !== 'SUSPENDED' && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal('SUSPENDED')}
                    className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Suspend
                  </button>
                )}
                {shop?.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal('ARCHIVED')}
                    className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Trail */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Security &amp; Credential Audit Trail ({auditLogs?.length || 0} events)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Target</th>
                  <th className="py-3 px-6">Actor</th>
                  <th className="py-3 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!auditLogs || auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No security audit events recorded for this account.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-6 text-slate-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-6">
                        <span className="font-semibold text-slate-900">{log.action}</span>
                      </td>
                      <td className="py-3 px-6 font-mono text-[11px] text-slate-600">
                        {log.targetType}: {log.targetId}
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

        {/* CONFIRMATION MODAL: RESET PASSWORD */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="text-base font-bold text-slate-900">Confirm Password Reset</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to reset the temporary password for{' '}
                <strong className="text-slate-900 font-mono">{owner.username}</strong>?
                <br /><br />
                The owner's current password will be immediately invalidated in MongoDB, and a new high-entropy temporary password will be returned once.
              </p>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={confirmPasswordReset}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
                >
                  {actionLoading ? 'Resetting...' : 'Yes, Reset Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL: ROTATE RECOVERY KEY */}
        {showRecoveryModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="text-base font-bold text-slate-900">Confirm Recovery Key Rotation</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rotating the Master Recovery Key for{' '}
                <strong className="text-slate-900 font-mono">{owner.username}</strong> will immediately invalidate the previous recovery key.
                <br /><br />
                The newly generated key will be displayed strictly once and should be stored safely in physical security storage.
              </p>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={confirmRecoveryKeyRotation}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
                >
                  {actionLoading ? 'Rotating...' : 'Yes, Rotate Recovery Key'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL: SHOP STATUS */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="text-base font-bold text-slate-900">
                  Confirm Status Change to {showStatusModal}
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {showStatusModal === 'SUSPENDED' && (
                  <>
                    Suspending <strong className="text-slate-900">{shop?.shopName}</strong> will immediately block new workstation activations and customer provisioning. Existing local desktop data is preserved.
                  </>
                )}
                {showStatusModal === 'ARCHIVED' && (
                  <>
                    Archiving <strong className="text-slate-900">{shop?.shopName}</strong> will mark the showroom as inactive and revoke linked license entitlements.
                  </>
                )}
                {showStatusModal === 'ACTIVE' && (
                  <>
                    Reactivating <strong className="text-slate-900">{shop?.shopName}</strong> will restore legitimate showroom license status and allow customer provisioning.
                  </>
                )}
              </p>
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
                    showStatusModal === 'ARCHIVED'
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