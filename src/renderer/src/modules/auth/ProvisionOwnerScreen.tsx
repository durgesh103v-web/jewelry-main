import React, { useState, type FormEvent } from 'react'
import {
  FiShield,
  FiUser,
  FiLock,
  FiKey,
  FiAward,
  FiAlertCircle,
  FiArrowRight,
  FiHome
} from 'react-icons/fi'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'

type Props = {
  onProvisioned: (session: AuthSession) => void
}

const inputClass =
  'w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60'

const labelClass = 'mb-2 block text-[13px] font-semibold text-slate-700'

function ProvisionOwnerScreen({ onProvisioned }: Props): React.JSX.Element {
  const [shopId, setShopId] = useState('')
  const [username, setUsername] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')

    const cleanShopId = shopId.trim().toUpperCase()
    const cleanUsername = username.trim().toLowerCase()
    const cleanPassword = temporaryPassword.trim()
    const cleanRecovery = recoveryKey.trim().toUpperCase()

    if (!cleanShopId) {
      setError('Please enter your Showroom Node ID (found on your onboarding certificate).')
      return
    }
    if (!cleanUsername) {
      setError('Please enter your administrator username.')
      return
    }
    if (!cleanPassword) {
      setError('Please enter your issued temporary password.')
      return
    }
    if (!cleanRecovery) {
      setError('Please enter your 16-character Master Recovery Key.')
      return
    }

    try {
      setSubmitting(true)
      const session = await window.api.auth.provisionOwner({
        shopId: cleanShopId,
        username: cleanUsername,
        temporaryPassword: cleanPassword,
        recoveryKey: cleanRecovery
      })

      onProvisioned(session)
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#f8f8f6] px-4 py-8 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Background ambient decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[460px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_45px_rgba(15,23,42,0.07)] sm:p-9">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 shadow-sm">
              <FiAward className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Showroom Owner Setup</h1>
            <p className="mt-1 text-xs text-slate-500">Initialize Local Point-of-Sale Terminal</p>
            <div className="mt-2.5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-[11px] font-semibold text-amber-800">
                <FiShield className="h-3 w-3 text-amber-600" />
                <span>SECURE ZERO-KNOWLEDGE PROVISIONING</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
              >
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Showroom Node ID */}
            <div>
              <label className={labelClass} htmlFor="provision-shop-id">
                Showroom Node ID
              </label>
              <div className="relative">
                <FiHome className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="provision-shop-id"
                  type="text"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  placeholder="e.g. SHOP-XXXXXXXX"
                  autoFocus
                  disabled={submitting}
                  className={`${inputClass} font-mono uppercase tracking-wide font-semibold`}
                />
              </div>
            </div>

            {/* Owner Username */}
            <div>
              <label className={labelClass} htmlFor="provision-username">
                Owner Username
              </label>
              <div className="relative">
                <FiUser className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="provision-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. owner_username"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Temporary Password */}
            <div>
              <label className={labelClass} htmlFor="provision-temp-password">
                Temporary Master Password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="provision-temp-password"
                  type="password"
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="Enter initial password from invoice"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Master Recovery Key */}
            <div>
              <label className={labelClass} htmlFor="provision-recovery-key">
                Master Recovery Key
              </label>
              <div className="relative">
                <FiKey className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="provision-recovery-key"
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="REC-XXXX-XXXX-XXXX"
                  disabled={submitting}
                  className={`${inputClass} font-mono uppercase tracking-wider font-semibold`}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-all duration-200 hover:from-amber-600 hover:to-amber-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Provisioning Showroom Terminal...</span>
                </>
              ) : (
                <>
                  <span>Initialize Terminal</span>
                  <FiArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <FiShield className="h-3.5 w-3.5 text-emerald-600" />
              <span>Offline-First Cryptographic Key Exchange</span>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default ProvisionOwnerScreen
