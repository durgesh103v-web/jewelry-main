import React, { useState, type FormEvent } from 'react'
import {
  FiUser,
  FiLock,
  FiHome,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiCheckCircle,
  FiAlertCircle,
  FiShoppingBag,
  FiLayers,
  FiShield,
  FiUserPlus,
  FiAward,
  FiHardDrive
} from 'react-icons/fi'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'

type Props = {
  onRegistered: (session: AuthSession) => void
}

const BUSINESS_TYPES: Array<{
  value: BusinessType
  title: string
  hint: string
  icon: typeof FiShoppingBag
}> = [
  {
    value: 'WHOLESALE',
    title: 'Wholesale & Bullion',
    hint: 'Pure Metal Hishob, Karigar Loss, Tunch, Sauda & Approvals',
    icon: FiShoppingBag
  },
  {
    value: 'RETAIL',
    title: 'Retail Showroom',
    hint: 'GST Invoicing, Barcode Estimates, Stock Vault & Daily Sales',
    icon: FiLayers
  }
]

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: '#334155' }
  let score = 0
  if (pass.length >= 4) score += 25
  if (pass.length >= 8) score += 25
  if (/[0-9]/.test(pass)) score += 25
  if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 25

  if (score <= 25) return { score: 25, label: 'Weak', color: '#ef4444' }
  if (score <= 50) return { score: 50, label: 'Fair', color: '#f59e0b' }
  if (score <= 75) return { score: 75, label: 'Good', color: '#3b82f6' }
  return { score: 100, label: 'Strong', color: '#10b981' }
}

function RegisterScreen({ onRegistered }: Props): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [firmName, setFirmName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('WHOLESALE')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const strength = calculatePasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Please enter an administrator username.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }
    if (!firmName.trim()) {
      setError('Please enter your shop / firm name.')
      return
    }

    try {
      setSubmitting(true)
      const session = await window.api.auth.register({
        username: username.trim(),
        password,
        firmName: firmName.trim(),
        businessType
      })
      onRegistered(session)
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* LEFT COLUMN: Luxury Showcase Hero Panel */}
      <div className="hidden lg:flex lg:w-6/12 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90 border-r border-amber-500/20">
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
                  Initial Setup
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Initialize Your Showroom Master Database
              </p>
            </div>
          </div>
        </div>

        {/* Center Value Proposition & Feature Highlights */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-lg">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Master Node Setup
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-1 leading-tight">
              Create Your Administrator Account & Firm Profile.
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed font-normal">
              This one-time setup provisions your offline encrypted SQLite database, sets up your master karigar books, and assigns your hardware key.
            </p>
          </div>

          {/* 3 Luxury Setup Highlights */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <FiHome className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  Personalized Showroom Invoicing
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Your firm name, GSTIN, and address will be printed cleanly on all customer tax invoices and thermal tags.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <FiShield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  Master Recovery Key Generation
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  A high-entropy disaster recovery key will be generated so you never lose access to your records.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <FiHardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  Zero Cloud Telemetry
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  All accounting data stays 100% private and encrypted on your local hard drive.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-400">Master Setup Mode</span>
          </div>
          <span className="font-mono text-slate-500">v1.0.0 Production</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Registration Form Panel */}
      <div className="w-full lg:w-6/12 flex items-center justify-center p-6 sm:p-10 relative bg-slate-900/60 backdrop-blur-2xl overflow-y-auto max-h-screen">
        <div className="w-full max-w-lg space-y-5 my-auto py-6">
          {/* Form Header */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Create Admin Account
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Setup Step 1 of 1
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Configure your showroom profile and master administrator credentials
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <FiAlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Shop / Firm Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reg-firm">
                Shop / Firm Name
              </label>
              <div className="relative flex items-center">
                <FiHome className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                <input
                  id="reg-firm"
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  autoFocus
                  placeholder="e.g. Royal Diamond & Gold Jewels"
                  disabled={submitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Business Type Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Primary Business Focus
              </label>
              <div className="grid grid-cols-2 gap-3">
                {BUSINESS_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = businessType === type.value
                  return (
                    <div
                      key={type.value}
                      onClick={() => setBusinessType(type.value)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                          : 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                        {isSelected && <FiCheckCircle className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                          {type.title}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {type.hint}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reg-username">
                Master Admin Username
              </label>
              <div className="relative flex items-center">
                <FiUser className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  disabled={submitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Password & Strength */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reg-password">
                Password
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  autoComplete="new-password"
                  disabled={submitting}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${strength.score}%`,
                        backgroundColor: strength.color
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Password Strength:</span>
                    <span className="font-bold" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider" htmlFor="reg-confirm">
                  Confirm Password
                </label>
                {passwordsMatch && (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <FiCheck className="w-3 h-3" /> Passwords match
                  </span>
                )}
                {passwordsMismatch && (
                  <span className="text-[11px] font-bold text-rose-400">Mismatch</span>
                )}
              </div>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-amber-400/80 w-4 h-4 pointer-events-none" />
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  disabled={submitting}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 focus:border-amber-400 focus:bg-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-500/20"
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

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-[0.99] mt-3"
            >
              <FiUserPlus className="w-4 h-4 font-bold" />
              <span>{submitting ? 'Initializing Master Database...' : 'Complete Master Setup & Enter ERP'}</span>
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <FiShield className="w-4 h-4 text-emerald-500" />
            <span>Air-Gapped Offline Protection • Local SQLite Storage</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterScreen
