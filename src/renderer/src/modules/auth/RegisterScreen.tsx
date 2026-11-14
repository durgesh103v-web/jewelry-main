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
  FiUserPlus
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

const inputClass =
  'w-full h-12 pl-11 pr-11 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60'

const labelClass =
  'mb-2 block text-[13px] font-semibold text-slate-700'

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: '#94a3b8' }
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
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#f8f8f6] px-4 py-8 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      {/* Main Register Container */}
      <div className="relative z-10 w-full max-w-[480px]">
        {/* Register Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_45px_rgba(15,23,42,0.07)] sm:p-9">
          {/* Form Heading */}
          <div className="mb-7 text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Create Admin Account
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
            >
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Shop / Firm Name */}
            <div>
              <label className={labelClass} htmlFor="reg-firm">
                Shop / Firm Name
              </label>
              <div className="relative">
                <FiHome className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-firm"
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  autoFocus
                  placeholder="e.g. Royal Diamond & Gold Jewels"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Business Type Selector */}
            <div>
              <label className={labelClass}>
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
                          ? 'bg-amber-50/80 border-amber-500 text-slate-900 shadow-sm ring-2 ring-amber-500/10'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                        {isSelected && <FiCheckCircle className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isSelected ? 'text-amber-800' : 'text-slate-900'}`}>
                          {type.title}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {type.hint}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className={labelClass} htmlFor="reg-username">
                Master Admin Username
              </label>
              <div className="relative">
                <FiUser className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelClass} htmlFor="reg-password">
                Password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  autoComplete="new-password"
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? (
                    <FiEyeOff className="h-[17px] w-[17px]" />
                  ) : (
                    <FiEye className="h-[17px] w-[17px]" />
                  )}
                </button>
              </div>

              {password.length > 0 && (
                <div className="space-y-1 pt-1.5">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${strength.score}%`,
                        backgroundColor: strength.color
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Password Strength:</span>
                    <span className="font-bold" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[13px] font-semibold text-slate-700" htmlFor="reg-confirm">
                  Confirm Password
                </label>
                {passwordsMatch && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <FiCheck className="h-3.5 w-3.5" />
                    Passwords match
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
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="h-[17px] w-[17px]" />
                  ) : (
                    <FiEye className="h-[17px] w-[17px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-all duration-200 hover:from-amber-600 hover:to-amber-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <FiUserPlus className="h-[17px] w-[17px]" />
              <span>{submitting ? 'Initializing Master Database...' : 'Complete Master Setup & Enter ERP'}</span>
            </button>
          </form>

          {/* Security Notice */}
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

export default RegisterScreen
