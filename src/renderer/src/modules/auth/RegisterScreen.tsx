import { useState, type FormEvent } from 'react'
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
import { authStyles as s } from './authStyles'

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
    title: 'Wholesale ERP',
    hint: 'Fine, Tunch, Hishob, Metal Ledgers, Sauda & Approvals',
    icon: FiShoppingBag
  },
  {
    value: 'RETAIL',
    title: 'Retail Billing',
    hint: 'GST Retail Invoicing, Barcode Estimates, Stock & Reports',
    icon: FiLayers
  }
]

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: '#e2e8f0' }
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
    <div style={s.screen}>
      <div style={s.glowOrb1} />
      <div style={s.glowOrb2} />

      <div style={{ ...s.card, maxWidth: '500px' }}>
        <div style={s.header}>
          <div style={s.logoRing}>
            <FiShield />
          </div>
          <h1 style={s.headerTitle}>Initial Setup & Setup Admin</h1>
          <p style={s.headerSub}>Initialize your Jewellery ERP database on this workstation</p>
          <div style={s.badge}>
            <FiCheckCircle size={12} />
            <span>ONE-TIME MASTER CONFIGURATION</span>
          </div>
        </div>

        <form style={s.body} onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={s.error} role="alert">
              <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={s.field}>
            <label style={s.label} htmlFor="reg-firm">
              <FiHome size={14} color="#d97706" />
              <span>Shop / Firm Name</span>
            </label>
            <div style={s.inputWrapper}>
              <div style={s.inputIcon}>
                <FiHome />
              </div>
              <input
                id="reg-firm"
                style={s.input}
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                autoFocus
                placeholder="e.g. Shree Mahalaxmi Jewellers"
                disabled={submitting}
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="reg-username">
              <FiUser size={14} color="#d97706" />
              <span>Admin Username</span>
            </label>
            <div style={s.inputWrapper}>
              <div style={s.inputIcon}>
                <FiUser />
              </div>
              <input
                id="reg-username"
                style={s.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or owner name"
                autoComplete="username"
                disabled={submitting}
              />
            </div>
          </div>

          <div style={s.field}>
            <div style={s.labelRow}>
              <label style={s.label} htmlFor="reg-password">
                <FiLock size={14} color="#d97706" />
                <span>Master Password</span>
              </label>
              {password && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: strength.color }}>
                  {strength.label}
                </span>
              )}
            </div>
            <div style={s.inputWrapper}>
              <div style={s.inputIcon}>
                <FiLock />
              </div>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                style={{ ...s.input, ...s.inputPassword }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters"
                autoComplete="new-password"
                disabled={submitting}
              />
              <button
                type="button"
                style={s.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {password.length > 0 && (
              <div style={s.strengthBarContainer}>
                <div
                  style={{
                    ...s.strengthBar,
                    width: `${strength.score}%`,
                    backgroundColor: strength.color
                  }}
                />
              </div>
            )}
          </div>

          <div style={s.field}>
            <div style={s.labelRow}>
              <label style={s.label} htmlFor="reg-confirm">
                <FiLock size={14} color="#d97706" />
                <span>Confirm Password</span>
              </label>
              {passwordsMatch && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <FiCheck size={12} /> Passwords match
                </span>
              )}
              {passwordsMismatch && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>
                  Passwords do not match
                </span>
              )}
            </div>
            <div style={s.inputWrapper}>
              <div style={s.inputIcon}>
                <FiLock />
              </div>
              <input
                id="reg-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                style={{
                  ...s.input,
                  ...s.inputPassword,
                  borderColor: passwordsMatch ? '#10b981' : passwordsMismatch ? '#ef4444' : '#cbd5e1'
                }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                disabled={submitting}
              />
              <button
                type="button"
                style={s.eyeButton}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>
              <FiLayers size={14} color="#d97706" />
              <span>Primary Business Type</span>
            </label>
            <div style={s.typeRow}>
              {BUSINESS_TYPES.map((option) => {
                const active = businessType === option.value
                const Icon = option.icon
                return (
                  <div
                    key={option.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => setBusinessType(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setBusinessType(option.value)
                    }}
                    style={{
                      ...s.typeOption,
                      ...(active ? s.typeOptionActive : {})
                    }}
                  >
                    <div style={{ ...s.typeTitle, ...(active ? s.typeTitleActive : {}) }}>
                      <Icon size={16} />
                      <span>{option.title}</span>
                    </div>
                    <p style={s.typeHint}>{option.hint}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...s.button,
              ...(submitting ? s.buttonDisabled : {})
            }}
          >
            <FiUserPlus size={16} />
            <span>{submitting ? 'Creating System & User...' : 'Initialize & Create Account'}</span>
          </button>

          <div style={s.securityBadge}>
            <FiShield size={13} color="#10b981" />
            <span>This account and business mode are securely locked to this installation.</span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterScreen
