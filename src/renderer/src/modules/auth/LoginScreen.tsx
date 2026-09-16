import { useState, type FormEvent } from 'react'
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
  FiCheck
} from 'react-icons/fi'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'
import { authStyles as s } from './authStyles'

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
      setSuccess('Password has been reset successfully! Please sign in with your new password.')
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
    <div style={s.screen}>
      <div style={s.glowOrb1} />
      <div style={s.glowOrb2} />

      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logoRing}>
            {mode === 'login' ? <FiAward /> : <FiKey />}
          </div>
          <h1 style={s.headerTitle}>
            {mode === 'login' ? 'Jewellery ERP' : 'Account Recovery'}
          </h1>
          <p style={s.headerSub}>
            {mode === 'login'
              ? 'Enterprise Management & Billing Suite'
              : 'Reset your password using your Master Recovery Key'}
          </p>
          <div style={s.badge}>
            <FiShield size={12} />
            <span>{mode === 'login' ? 'SECURE ACCESS PORTAL' : 'AUTHORIZED RESET'}</span>
          </div>
        </div>

        {mode === 'login' ? (
          <form style={s.body} onSubmit={handleLoginSubmit} noValidate>
            {error && (
              <div style={s.error} role="alert">
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={s.success} role="status">
                <FiCheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            <div style={s.field}>
              <label style={s.label} htmlFor="login-username">
                <FiUser size={14} color="#d97706" />
                <span>Username</span>
              </label>
              <div style={s.inputWrapper}>
                <div style={s.inputIcon}>
                  <FiUser />
                </div>
                <input
                  id="login-username"
                  style={s.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus={!knownUsername}
                  placeholder="Enter username"
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
            </div>

            <div style={s.field}>
              <div style={s.labelRow}>
                <label style={s.label} htmlFor="login-password">
                  <FiLock size={14} color="#d97706" />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  style={s.forgotLink}
                  onClick={switchToForgot}
                >
                  Forgot password?
                </button>
              </div>
              <div style={s.inputWrapper}>
                <div style={s.inputIcon}>
                  <FiLock />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...s.input, ...s.inputPassword }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus={Boolean(knownUsername)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...s.button,
                ...s.buttonPrimary,
                ...(submitting ? s.buttonDisabled : {})
              }}
            >
              <FiLogIn size={16} />
              <span>{submitting ? 'Authenticating...' : 'Sign In to Account'}</span>
            </button>

            <div style={s.securityBadge}>
              <FiShield size={13} color="#10b981" />
              <span>Offline-First Encrypted Database • Local Node</span>
            </div>
          </form>
        ) : (
          <form style={s.body} onSubmit={handleResetSubmit} noValidate>
            {error && (
              <div style={s.error} role="alert">
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={s.helperCard}>
              Enter your admin username and the Master Recovery Key generated during system setup.
            </div>

            <div style={s.field}>
              <label style={s.label} htmlFor="reset-username">
                <FiUser size={14} color="#d97706" />
                <span>Username</span>
              </label>
              <div style={s.inputWrapper}>
                <div style={s.inputIcon}>
                  <FiUser />
                </div>
                <input
                  id="reset-username"
                  style={s.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  placeholder="Enter administrator username"
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label} htmlFor="reset-recovery">
                <FiKey size={14} color="#d97706" />
                <span>Master Recovery Key</span>
              </label>
              <div style={s.inputWrapper}>
                <div style={s.inputIcon}>
                  <FiKey />
                </div>
                <input
                  id="reset-recovery"
                  style={s.input}
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="e.g. XXXX-XXXX-XXXX-XXXX"
                  disabled={submitting}
                />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label} htmlFor="reset-new-password">
                <FiLock size={14} color="#d97706" />
                <span>New Password</span>
              </label>
              <div style={s.inputWrapper}>
                <div style={s.inputIcon}>
                  <FiLock />
                </div>
                <input
                  id="reset-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  style={{ ...s.input, ...s.inputPassword }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  style={s.eyeButton}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div style={s.field}>
              <div style={s.labelRow}>
                <label style={s.label} htmlFor="reset-confirm-password">
                  <FiLock size={14} color="#d97706" />
                  <span>Confirm New Password</span>
                </label>
                {passwordsMatch && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <FiCheck size={12} /> Match
                  </span>
                )}
                {passwordsMismatch && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>
                    Mismatch
                  </span>
                )}
              </div>
              <div style={s.inputWrapper}>
                <div style={s.inputIcon}>
                  <FiLock />
                </div>
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  style={{
                    ...s.input,
                    ...s.inputPassword,
                    borderColor: passwordsMatch ? '#10b981' : passwordsMismatch ? '#ef4444' : '#cbd5e1'
                  }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...s.button,
                ...(submitting ? s.buttonDisabled : {})
              }}
            >
              <FiCheckCircle size={16} />
              <span>{submitting ? 'Resetting Password...' : 'Reset Password'}</span>
            </button>

            <button
              type="button"
              style={s.secondaryButton}
              onClick={switchToLogin}
              disabled={submitting}
            >
              <FiArrowLeft size={14} />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default LoginScreen
