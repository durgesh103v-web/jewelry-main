
import React, { useState, type FormEvent } from 'react'
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLogIn,
  FiShield,
  FiAlertCircle,
  FiKey,
  FiCheckCircle,
  FiArrowLeft,
  FiCheck
} from 'react-icons/fi'

import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'

type Props = {
  knownUsername: string | null
  onLoggedIn: (session: AuthSession) => void
}

type Mode = 'login' | 'forgot'

const inputClass =
  'w-full h-12 pl-11 pr-11 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60'

const labelClass =
  'mb-2 block text-[13px] font-semibold text-slate-700'

function LoginScreen({
  knownUsername,
  onLoggedIn,
}: Props): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState(knownUsername ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Password recovery state
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword

  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword

  const clearMessages = (): void => {
    setError('')
    setSuccess('')
  }

  const handleLoginSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    clearMessages()

    if (!username.trim() || !password) {
      setError('Please enter both your username and password.')
      return
    }

    try {
      setSubmitting(true)

      const session = await window.api.auth.login({
        username: username.trim(),
        password,
      })

      onLoggedIn(session)
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    clearMessages()

    if (!username.trim()) {
      setError('Please enter your administrator username.')
      return
    }

    if (!recoveryCode.trim()) {
      setError('Please enter your Master Recovery Key.')
      return
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      return
    }

    try {
      setSubmitting(true)

      await window.api.auth.resetPassword({
        username: username.trim(),
        recoveryCode: recoveryCode.trim(),
        newPassword,
      })

      setSuccess(
        'Password reset successfully! Please sign in with your new password.'
      )

      setPassword(newPassword)
      setMode('login')
      setRecoveryCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const switchToForgot = (): void => {
    clearMessages()
    setMode('forgot')
  }

  const switchToLogin = (): void => {
    clearMessages()
    setMode('login')
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#f8f8f6] px-4 py-8 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900">

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Login Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_45px_rgba(15,23,42,0.07)] sm:p-9">
          {/* Form Heading */}
          <div className="mb-7 text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? 'Sign in' : 'Account Recovery'}
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
            >
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700"
            >
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* LOGIN FORM */
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-5"
              noValidate
            >

              {/* Username */}
              <div>
                <label className={labelClass} htmlFor="login-username">
                  Username
                </label>

                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus={!knownUsername}
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700" htmlFor="login-password">
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={switchToForgot}
                    disabled={submitting}
                    className="text-xs cursor-pointer  font-semibold text-amber-600 transition-colors hover:text-amber-700 disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus={Boolean(knownUsername)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={submitting}
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={submitting}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                  >
                    {showPassword
                      ? <FiEyeOff className="h-[17px] w-[17px]" />
                      : <FiEye className="h-[17px] w-[17px]" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex  h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-all duration-200 hover:from-amber-600 hover:to-amber-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <FiLogIn className="h-[17px] w-[17px]" />

                {submitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* FORGOT PASSWORD FORM */
            <form
              onSubmit={handleResetSubmit}
              className="space-y-4"
              noValidate
            >

              {/* Username */}
              <div>
                <label className={labelClass} htmlFor="reset-username">
                  Username
                </label>

                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                  <input
                    id="reset-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    placeholder="Enter administrator username"
                    autoComplete="username"
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Recovery Key */}
              <div>
                <label className={labelClass} htmlFor="reset-recovery">
                  Master Recovery Key
                </label>

                <div className="relative">
                  <FiKey className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                  <input
                    id="reset-recovery"
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="REC-XXXX-XXXX-XXXX"
                    autoComplete="off"
                    disabled={submitting}
                    className={`${inputClass} font-mono uppercase tracking-wide`}
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className={labelClass} htmlFor="reset-new-password">
                  New Password
                </label>

                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={submitting}
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    disabled={submitting}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword
                      ? <FiEyeOff className="h-[17px] w-[17px]" />
                      : <FiEye className="h-[17px] w-[17px]" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700" htmlFor="reset-confirm-password">
                    Confirm New Password
                  </label>

                  {passwordsMatch && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <FiCheck className="h-3.5 w-3.5" />
                      Match
                    </span>
                  )}

                  {passwordsMismatch && (
                    <span className="text-xs font-semibold text-rose-600">
                      Mismatch
                    </span>
                  )}
                </div>

                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={submitting}
                    className={`${inputClass} ${
                      passwordsMismatch
                        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10'
                        : passwordsMatch
                          ? 'border-emerald-300 focus:border-emerald-400'
                          : ''
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={submitting}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirmPassword
                      ? <FiEyeOff className="h-[17px] w-[17px]" />
                      : <FiEye className="h-[17px] w-[17px]" />}
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiKey className="h-[17px] w-[17px]" />
                {submitting ? 'Resetting Password...' : 'Reset Password & Unlock'}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={switchToLogin}
                disabled={submitting}
                className="cursor-pointer  flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to Sign In
              </button>
            </form>
          )}

          {/* Security Information */}
          <div className="mt-7 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <FiShield className="h-4 w-4 text-emerald-600" />
              <span>Protected with DPAPI Air-Gapped Encryption</span>
            </div>
          </div>
        </section>

    
      </div>
    </main>
  )
}

export default LoginScreen
