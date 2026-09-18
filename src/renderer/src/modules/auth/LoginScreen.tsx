import React, { useState, type FormEvent } from 'react'
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLogIn,
  FiShield,
  FiAlertCircle,
  FiAward,
  FiKey,
  FiCheckCircle,
  FiArrowLeft,
  FiCheck,
  FiLayers,
  FiCpu,
  FiHardDrive
} from 'react-icons/fi'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'

type Props = {
  knownUsername: string | null
  onLoggedIn: (session: AuthSession) => void
}

type Mode = 'login' | 'forgot'

function LoginScreen({ knownUsername, onLoggedIn }: Props): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState(knownUsername ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Forgot password form state
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  const handleLoginSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!username.trim() || !password) {
      setError('Please enter both your username and password.')
      return
    }

    try {
      setSubmitting(true)
      const session = await window.api.auth.login({ username: username.trim(), password })
      onLoggedIn(session)
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')
    setSuccess('')

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
        newPassword
      })
      setSuccess('Password reset successfully! Please sign in with your new password.')
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
    setError('')
    setSuccess('')
    setMode('forgot')
  }

  const switchToLogin = (): void => {
    setError('')
    setMode('login')
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* LEFT COLUMN: Luxury Showcase Hero Panel */}
      <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90 border-r border-amber-500/20">
        {/* Ambient Gold & Sapphire Lighting Blooms */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding Section */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 text-2xl font-bold">
                <FiAward />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-wider text-white uppercase">
                  Jewellery ERP
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
                  Enterprise Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Commercial Wholesale & Retail Jewellery Management
              </p>
            </div>
          </div>
        </div>

        {/* Center Value Proposition & Feature Highlights */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-lg">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Terminal Authorization
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-1 leading-tight">
              Precision Bullion Hishob, Fast Billing & Vault Security.
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed font-normal">
              Designed specifically for jewellery manufacturers, wholesalers, and retail showrooms with offline-first DPAPI data isolation.
            </p>
          </div>

          {/* 3 Luxury Feature Badges */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md transition-all hover:bg-white/[0.06] hover:border-amber-500/30">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <FiLayers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  Real-Time Bullion & Fine Metal Hishob
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Automatic purity calculations, karigar issue/loss tracking, and daily metal ledger balances.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md transition-all hover:bg-white/[0.06] hover:border-amber-500/30">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <FiCpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  Thermal Barcode & RFID Hub
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  High-speed 100-item tray scanning, jewelry rat/tag printing, and rapid POS estimate billing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md transition-all hover:bg-white/[0.06] hover:border-amber-500/30">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <FiHardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  100% Permanently Offline Operation
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Hardware-bound cryptographic license. Never stops functioning during network blackouts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-400">Encrypted Local SQLite Database</span>
          </div>
          <span className="font-mono text-slate-500">v1.0.0 Production</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Authentication Form Panel */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-6 sm:p-12 relative bg-slate-900/60 backdrop-blur-2xl">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-Only Header Brand */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 text-2xl font-bold mx-auto shadow-lg shadow-amber-500/20">
              <FiAward />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">
              Jewellery ERP
            </h2>
            <p className="text-xs text-slate-400">Commercial Billing & Inventory Suite</p>
          </div>

          {/* Form Header */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {mode === 'login' ? 'Welcome Back' : 'Master Key Recovery'}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {mode === 'login' ? 'Terminal Login' : 'Admin Reset'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {mode === 'login'
                ? 'Enter your credentials to access your showroom terminal'
                : 'Enter your username and the Master Recovery Key generated during setup'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <FiAlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <FiCheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* 1. LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="login-username">
                  Username
                </label>
                <div className="relative flex items-center">
                  <FiUser className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus={!knownUsername}
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={submitting}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="login-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <FiLock className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus={Boolean(knownUsername)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={submitting}
                    className="w-full pl-10 pr-11 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-[0.99] mt-2"
              >
                <FiLogIn className="w-4 h-4 font-bold" />
                <span>{submitting ? 'Authenticating Terminal...' : 'Sign In to Showroom'}</span>
              </button>
            </form>
          ) : (
            /* 2. FORGOT / RESET PASSWORD FORM */
            <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                Provide your username and the Master Recovery Key that was generated when you initialized this database.
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reset-username">
                  Username
                </label>
                <div className="relative flex items-center">
                  <FiUser className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                  <input
                    id="reset-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    placeholder="Enter administrator username"
                    autoComplete="username"
                    disabled={submitting}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reset-recovery">
                  Master Recovery Key
                </label>
                <div className="relative flex items-center">
                  <FiKey className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                  <input
                    id="reset-recovery"
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="REC-XXXX-XXXX-XXXX"
                    autoComplete="off"
                    disabled={submitting}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm font-mono text-amber-300 placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20 uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reset-new-password">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <FiLock className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={submitting}
                    className="w-full pl-10 pr-11 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reset-confirm-password">
                    Confirm New Password
                  </label>
                  {passwordsMatch && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <FiCheck className="w-3 h-3" /> Match
                    </span>
                  )}
                  {passwordsMismatch && (
                    <span className="text-[11px] font-bold text-rose-400">Mismatch</span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <FiLock className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={submitting}
                    className="w-full pl-10 pr-11 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-[0.99] mt-2"
              >
                <FiKey className="w-4 h-4 font-bold" />
                <span>{submitting ? 'Resetting Password...' : 'Reset Password & Unlock'}</span>
              </button>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <FiShield className="w-4 h-4 text-emerald-500" />
            <span>DPAPI Air-Gapped Encryption • Workstation Locked</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
