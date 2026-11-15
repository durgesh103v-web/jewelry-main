import React, { useState, type FormEvent } from 'react'
import {
  FiLock,
  FiShield,
  FiAward,
  FiAlertCircle,
  FiArrowRight,
  FiEye,
  FiEyeOff
} from 'react-icons/fi'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'

type Props = {
  username: string
  onPasswordChanged: () => void
}

const inputClass =
  'w-full h-12 pl-11 pr-11 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60'

const labelClass = 'mb-2 block text-[13px] font-semibold text-slate-700'

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: '#94a3b8' }
  let score = 0
  if (pass.length >= 6) score += 25
  if (pass.length >= 8) score += 25
  if (/[0-9]/.test(pass)) score += 25
  if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 25

  if (score <= 25) return { score: 25, label: 'Weak', color: '#ef4444' }
  if (score <= 50) return { score: 50, label: 'Fair', color: '#f59e0b' }
  if (score <= 75) return { score: 75, label: 'Good', color: '#3b82f6' }
  return { score: 100, label: 'Strong', color: '#10b981' }
}

function ChangePasswordScreen({ username, onPasswordChanged }: Props): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const strength = calculatePasswordStrength(newPassword)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')

    if (!currentPassword) {
      setError('Please enter your current temporary password.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from your temporary password.')
      return
    }

    try {
      setSubmitting(true)
      const res = await window.api.auth.changePassword({
        currentPassword,
        newPassword
      })

      if (res.success) {
        onPasswordChanged()
      }
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Set Permanent Password</h1>
            <p className="mt-1 text-xs text-slate-500">First-Time Setup for Administrator: <strong className="text-slate-800">{username}</strong></p>
            <div className="mt-2.5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-[11px] font-semibold text-amber-800">
                <FiShield className="h-3 w-3 text-amber-600" />
                <span>ARGON2ID PASSWORD SECURITY</span>
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

            {/* Current Password */}
            <div>
              <label className={labelClass} htmlFor="change-current-pass">
                Current Temporary Password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="change-current-pass"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  autoFocus
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className={labelClass} htmlFor="change-new-pass">
                New Permanent Password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="change-new-pass"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              {newPassword && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                    />
                  </div>
                  <span style={{ color: strength.color }} className="font-semibold">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClass} htmlFor="change-confirm-pass">
                Confirm New Password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="change-confirm-pass"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Toggle show password */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {showPasswords ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
                <span>{showPasswords ? 'Hide passwords' : 'Show passwords'}</span>
              </button>
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
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save Password & Launch ERP</span>
                  <FiArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default ChangePasswordScreen
