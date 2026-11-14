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
import { authStyles as s } from './authStyles'

type Props = {
  onProvisioned: (session: AuthSession) => void
}

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
    <div style={s.screen}>
      <div style={s.glowOrb1} />
      <div style={s.glowOrb2} />

      <div style={{ ...s.card, maxWidth: '520px' }}>
        <div style={s.header}>
          <div style={s.logoRing}>
            <FiAward />
          </div>
          <h1 style={s.headerTitle}>Showroom Owner Setup</h1>
          <p style={s.headerSub}>Verify Onboarding Credentials to Initialize Local Terminal</p>
          <div style={s.badge}>
            <FiShield size={12} />
            <span>CENTRAL LICENSING AUTHORITY • ZERO KNOWLEDGE</span>
          </div>
        </div>

        <form style={s.body} onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={s.error} role="alert">
              <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Showroom Node ID */}
          <div style={s.field}>
            <label style={s.label}>Showroom Node ID *</label>
            <div style={s.inputWrap}>
              <FiHome style={s.icon} />
              <input
                type="text"
                value={shopId}
                onChange={(e) => {
                  setShopId(e.target.value.toUpperCase())
                  if (error) setError('')
                }}
                placeholder="e.g. SHOP-2026-XXXXX"
                autoComplete="off"
                style={{ ...s.input, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                disabled={submitting}
              />
            </div>
            <p style={{ ...s.hint, fontSize: '11px', marginTop: '4px', color: '#94a3b8' }}>
              From your official Jewellery ERP Onboarding Certificate
            </p>
          </div>

          {/* Administrator Username */}
          <div style={s.field}>
            <label style={s.label}>Administrator Username *</label>
            <div style={s.inputWrap}>
              <FiUser style={s.icon} />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase())
                  if (error) setError('')
                }}
                placeholder="e.g. owner_showroom"
                autoComplete="off"
                style={{ ...s.input, fontFamily: 'monospace' }}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Temporary Password */}
          <div style={s.field}>
            <label style={s.label}>Issued Temporary Password *</label>
            <div style={s.inputWrap}>
              <FiLock style={s.icon} />
              <input
                type="password"
                value={temporaryPassword}
                onChange={(e) => {
                  setTemporaryPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter temporary password"
                style={s.input}
                disabled={submitting}
              />
            </div>
            <p style={{ ...s.hint, fontSize: '11px', marginTop: '4px', color: '#f59e0b' }}>
              You will be prompted to create a new permanent password immediately
            </p>
          </div>

          {/* Master Recovery Key */}
          <div style={s.field}>
            <label style={s.label}>Master Recovery Key (16 Characters) *</label>
            <div style={s.inputWrap}>
              <FiKey style={s.icon} />
              <input
                type="text"
                value={recoveryKey}
                onChange={(e) => {
                  setRecoveryKey(e.target.value.toUpperCase())
                  if (error) setError('')
                }}
                placeholder="e.g. A1B2-C3D4-E5F6-G7H8"
                autoComplete="off"
                style={{ ...s.input, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                disabled={submitting}
              />
            </div>
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
            <span>{submitting ? 'Verifying with Licensing Authority...' : 'Verify & Provision Terminal'}</span>
            <FiArrowRight />
          </button>
        </form>

        <div style={s.footer}>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
            Jewellery ERP Enterprise Licensing • Cryptographically signed with Ed25519 &amp; Argon2id
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProvisionOwnerScreen