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
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9-]/g, '')
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
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#f8f8f6] px-4 py-8 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Background ambient decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      {/* Main Activation Container */}
      <div className="relative z-10 w-full max-w-[460px]">
        {/* Activation Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_45px_rgba(15,23,42,0.07)] sm:p-9">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 shadow-sm">
              <FiAward className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Activate Jewellery ERP</h1>
            <p className="mt-1 text-xs text-slate-500">Commercial License & Device Activation</p>
            <div className="mt-2.5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-[11px] font-semibold text-amber-800">
                <FiShield className="h-3 w-3 text-amber-600" />
                <span>OFFLINE-READY COMMERCIAL LICENSE</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
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

            {/* This Computer Device ID Box */}
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <FiCpu className="h-3.5 w-3.5 text-amber-600" />
                  <span>This Computer Device ID</span>
                </div>
                <div className="mt-1 font-mono text-sm font-bold tracking-wide text-slate-900">
                  {machineId || 'Generating...'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyMachineId}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                title="Copy Device ID"
              >
                {copied ? (
                  <FiCheck className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <FiCopy className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span className={copied ? 'text-emerald-700' : ''}>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Product License Key Input */}
            <div className="mb-4">
              <label className="mb-2 block text-[13px] font-semibold text-slate-700" htmlFor="license-key">
                Product License Key
              </label>
              <div className="relative">
                <FiKey className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
                <input
                  id="license-key"
                  type="text"
                  value={productKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  autoFocus
                  placeholder="e.g. JERP-PRO-7K4M-92XA-PL8Q"
                  autoComplete="off"
                  disabled={submitting}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-mono uppercase tracking-wider font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Format: Provided in your software invoice or Super Admin onboarding PDF.
              </p>
            </div>

            {/* Offline-First Notice */}
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-xs leading-relaxed text-amber-900">
              <FiWifi className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <strong>Internet connection required only once</strong> for initial device binding. After activation, the ERP operates completely offline.
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-all duration-200 hover:from-amber-600 hover:to-amber-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Verifying & Binding License...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="h-[18px] w-[18px]" />
                  <span>Activate Jewellery ERP</span>
                </>
              )}
            </button>

            {/* Cryptographic Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <FiShield className="h-3.5 w-3.5 text-emerald-600" />
              <span>Cryptographically Signed with Ed25519 • Machine Bound</span>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default ActivationScreen
