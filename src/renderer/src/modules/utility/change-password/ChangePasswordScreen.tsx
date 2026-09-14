import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiInfo,
  FiLock,
  FiRotateCcw,
  FiShield,
  FiUser,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type Props = {
  onClose: () => void
}

function calculateStrength(password: string): {
  score: number
  label: string
  color: string
  barClass: string
} {
  if (!password) return { score: 0, label: 'Empty', color: 'text-slate-400', barClass: 'bg-slate-200' }
  let score = 0
  if (password.length >= 4) score += 1
  if (password.length >= 8) score += 1
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score <= 1) return { score: 25, label: 'Weak', color: 'text-rose-600', barClass: 'bg-rose-500' }
  if (score === 2) return { score: 50, label: 'Fair', color: 'text-amber-600', barClass: 'bg-amber-500' }
  if (score === 3) return { score: 75, label: 'Good', color: 'text-blue-600', barClass: 'bg-blue-500' }
  return { score: 100, label: 'Strong', color: 'text-emerald-600', barClass: 'bg-emerald-500' }
}

function ChangePasswordScreen({ onClose }: Props): React.JSX.Element {
  const [username, setUsername] = useState<string>('Administrator')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const [submitting, setSubmitting] = useState(false)

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 4000)
  }, [])

  useEffect(() => {
    window.api.auth
      .getState()
      .then((st) => {
        if (st?.username) {
          setUsername(st.username)
        }
      })
      .catch(() => {
        // Default username remains
      })

    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [])

  const resetFields = (): void => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const strength = useMemo(() => calculateStrength(newPassword), [newPassword])

  const requirements = useMemo(() => {
    return {
      minLength: newPassword.length >= 4,
      hasMatch: Boolean(newPassword && newPassword === confirmPassword),
      isDifferent: Boolean(newPassword && currentPassword && newPassword !== currentPassword)
    }
  }, [newPassword, confirmPassword, currentPassword])

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()

    if (!currentPassword) {
      showAlert('warning', 'Please enter your current password.')
      return
    }

    if (newPassword.length < 4) {
      showAlert('warning', 'New password must be at least 4 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      showAlert('error', 'New password and confirm password do not match.')
      return
    }

    if (newPassword === currentPassword) {
      showAlert('warning', 'New password cannot be the same as your current password.')
      return
    }

    try {
      setSubmitting(true)
      await window.api.auth.changePassword({ currentPassword, newPassword })
      showAlert('success', 'Password changed successfully. Your new credentials are active.')
      resetFields()
    } catch (err) {
      showAlert('error', getFriendlyErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiShield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Account Security & Password</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {username}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Update administrator login credentials and system authentication keys
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFields}
            disabled={submitting || (!currentPassword && !newPassword && !confirmPassword)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Fields</span>
          </button>

          <button
            type="button"
            onClick={(e) => void handleSubmit(e)}
            disabled={submitting}
            className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <FiCheckCircle className="w-3.5 h-3.5" />
            <span>{submitting ? 'Updating...' : 'Update Password'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

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

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {alertMessage && (
          <div className="shrink-0 no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          {/* Left Column: Form & Checklist (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto pr-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <FiLock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Change User Password
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enter your existing password followed by your chosen new password
                  </p>
                </div>
              </div>

              {/* Current Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="currentPassword">
                  Current Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    className="w-full h-9 pl-3.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="newPassword">
                  New Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    autoComplete="new-password"
                    className="w-full h-9 pl-3.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Password Strength:</span>
                      <strong className={`font-bold ${strength.color}`}>{strength.label}</strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full transition-all duration-300 ${strength.barClass}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="confirmPassword">
                  Confirm New Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password to confirm"
                    autoComplete="new-password"
                    className={`w-full h-9 pl-3.5 pr-10 text-xs bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs font-medium ${
                      confirmPassword && newPassword
                        ? newPassword === confirmPassword
                          ? 'border-emerald-500 focus:border-emerald-500'
                          : 'border-rose-400 focus:border-rose-400'
                        : 'border-slate-300 focus:border-amber-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Match indicator */}
                {confirmPassword && (
                  <p
                    className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${
                      newPassword === confirmPassword ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {newPassword === confirmPassword ? (
                      <>
                        <FiCheck className="w-3.5 h-3.5" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <FiX className="w-3.5 h-3.5" />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Live Validation Checklist */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 flex flex-col gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Password Requirements:
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      requirements.minLength
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    ✓
                  </span>
                  <span className={requirements.minLength ? 'text-slate-800 font-semibold' : 'text-slate-500'}>
                    At least 4 characters long
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      requirements.hasMatch
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    ✓
                  </span>
                  <span className={requirements.hasMatch ? 'text-slate-800 font-semibold' : 'text-slate-500'}>
                    Passwords match exactly
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      requirements.isDifferent
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    ✓
                  </span>
                  <span className={requirements.isDifferent ? 'text-slate-800 font-semibold' : 'text-slate-500'}>
                    Different from current password
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{submitting ? 'Saving New Password...' : 'Save Password Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Security Hub & Guidance (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto">
            {/* Active Account Identity Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-lg font-black">
                  <FiUser className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {username}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Authenticated Session</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Access Level
                  </span>
                  <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                    System Master Admin
                  </strong>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Storage Scope
                  </span>
                  <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                    Local Secure DB
                  </strong>
                </div>
              </div>
            </div>

            {/* Security Best Practices Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <FiAlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Security Guidelines</span>
              </div>

              <ul className="text-xs text-slate-600 flex flex-col gap-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    Keep administrator passwords strictly confidential between authorized jewelry store owners and partners.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    Avoid predictable passwords such as shop contact numbers, founding years, or simple sequential numbers.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    Changing your password takes effect immediately for all subsequent logins on this terminal.
                  </span>
                </li>
              </ul>
            </div>

            {/* Terminal Notice */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-950 shadow-2xs">
              <FiInfo className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                If you ever forget your password, contact your technical system administrator to perform an offline credential reset via database utility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordScreen
