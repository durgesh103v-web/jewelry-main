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
import { authStyles as s } from './authStyles'

type Props = {
  username: string
  onPasswordChanged: () => void
}

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
    <div style={s.screen}>
      <div style={s.glowOrb1} />
      <div style={s.glowOrb2} />

      <div style={{ ...s.card, maxWidth: '480px' }}>
        <div style={s.header}>
          <div style={s.logoRing}>
            <FiAward />
          </div>
          <h1 style={s.headerTitle}>Initial Password Change</h1>
          <p style={s.headerSub}>
            Welcome, <strong style={{ color: '#d97706' }}>{username}</strong>. A permanent password is required before accessing ERP modules.
          </p>
          <div style={s.badge}>
            <FiShield size={12} />
            <span>MANDATORY FIRST-LOGIN SECURITY POLICY</span>
          </div>
        </div>

        <form style={s.body} onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={s.error} role="alert">
              <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Current Temporary Password */}
          <div style={s.field}>
            <label style={s.label}>Current Temporary Password *</label>
            <div style={s.inputWrap}>
              <FiLock style={s.icon} />
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter temporary password"
                style={s.input}
                disabled={submitting}
              />
            </div>
          </div>

          {/* New Password */}
          <div style={s.field}>
            <label style={s.label}>Create Permanent Password *</label>
            <div style={s.inputWrap}>
              <FiLock style={s.icon} />
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="At least 6 characters"
                style={s.input}
                disabled={submitting}
              />
            </div>
            {newPassword && (
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <div style={{ flex: 1, height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${strength.score}%`, height: '100%', background: strength.color, transition: 'all 0.3s' }} />
                </div>
                <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={s.field}>
            <label style={s.label}>Confirm Permanent Password *</label>
            <div style={s.inputWrap}>
              <FiLock style={s.icon} />
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Re-enter permanent password"
                style={s.input}
                disabled={submitting}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setShowPasswords(!showPasswords)}>
            {showPasswords ? <FiEyeOff /> : <FiEye />}
            <span>{showPasswords ? 'Hide passwords' : 'Show passwords'}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...s.btn,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            <span>{submitting ? 'Saving Permanent Credentials...' : 'Save Password & Launch ERP'}</span>
            <FiArrowRight />
          </button>
        </form>

        <div style={s.footer}>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
            Local credentials encrypted with Argon2id / Scrypt on this terminal
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordScreen