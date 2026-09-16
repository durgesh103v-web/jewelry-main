import React, { useState, useEffect, type FormEvent } from 'react'
import {
  FiKey,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiCpu,
  FiCopy,
  FiCheck,
  FiAward,
  FiWifi
} from 'react-icons/fi'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'
import { authStyles as s } from '../auth/authStyles'

type Props = {
  onActivated: (license: LicenseInfo) => void
  initialMessage?: string
}

function ActivationScreen({ onActivated, initialMessage }: Props): React.JSX.Element {
  const [productKey, setProductKey] = useState('')
  const [machineId, setMachineId] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(initialMessage ?? '')

  useEffect(() => {
    window.api.license
      .getMachineId()
      .then((id) => setMachineId(id))
      .catch(() => setMachineId('MID-LOCAL-NODE'))
  }, [])

  const handleCopyMachineId = (): void => {
    if (!machineId) return
    navigator.clipboard.writeText(machineId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleKeyChange = (val: string): void => {
    // Auto uppercase and clean up
    let cleaned = val.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    setProductKey(cleaned)
    if (error) setError('')
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')

    const trimmed = productKey.trim()
    if (!trimmed) {
      setError('Please enter your software product key.')
      return
    }

    try {
      setSubmitting(true)
      const result = await window.api.license.activate({ productKey: trimmed })

      if (result.success && result.license) {
        onActivated(result.license)
      } else {
        setError(result.message || 'Activation failed. Please check your product key.')
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

      <div style={{ ...s.card, maxWidth: '520px' }}>
        <div style={s.header}>
          <div style={s.logoRing}>
            <FiAward />
          </div>
          <h1 style={s.headerTitle}>Activate Jewellery ERP</h1>
          <p style={s.headerSub}>Commercial License & Device Activation</p>
          <div style={s.badge}>
            <FiShield size={12} />
            <span>MODEL A • OFFLINE-READY LICENSE</span>
          </div>
        </div>

        <form style={s.body} onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={s.error} role="alert">
              <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiCpu size={13} color="#d97706" />
                <span>This Computer Device ID</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                {machineId || 'Generating...'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyMachineId}
              style={{
                background: copied ? '#ecfdf5' : '#ffffff',
                border: copied ? '1px solid #10b981' : '1px solid #cbd5e1',
                color: copied ? '#059669' : '#475569',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Copy Machine ID"
            >
              {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="license-key">
              <FiKey size={14} color="#d97706" />
              <span>Product License Key</span>
            </label>
            <div style={s.inputWrapper}>
              <div style={s.inputIcon}>
                <FiKey />
              </div>
              <input
                id="license-key"
                style={{
                  ...s.input,
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  fontWeight: 600
                }}
                value={productKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                autoFocus
                placeholder="e.g. JERP-PRO-7K4M-92XA-PL8Q"
                autoComplete="off"
                disabled={submitting}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Format: Provided in your software invoice or purchase confirmation.
            </div>
          </div>

          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: '#1e40af',
              lineHeight: '1.4'
            }}
          >
            <FiWifi size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Internet connection required only once</strong> for initial activation and device binding. After activation, the ERP runs completely offline.
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
            <span>{submitting ? 'Verifying & Binding License...' : 'Activate Jewellery ERP'}</span>
          </button>

          <div style={s.securityBadge}>
            <FiShield size={13} color="#10b981" />
            <span>Cryptographically Signed with Ed25519 • Machine Bound</span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ActivationScreen
