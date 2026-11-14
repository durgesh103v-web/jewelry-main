'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi, ApiError } from '@/lib/api'
import { CreateShopPayload, OneTimeCredentials } from '@/types'
import {
  Store,
  User,
  Key,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Copy,
  Download,
  AlertTriangle,
  ArrowRight,
  Lock,
  Sparkles,
  Building2,
  FileText
} from 'lucide-react'

export default function CreateShopWizardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<OneTimeCredentials | null>(null)

  // Form State
  const [formData, setFormData] = useState<CreateShopPayload>({
    shopName: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    businessType: 'RETAIL',
    edition: 'PROFESSIONAL',
    maxAllowedMachines: 1,
    validityDays: null,
    customUsername: '',
    notes: ''
  })

  const [validityMode, setValidityMode] = useState<'PERPETUAL' | 'CUSTOM'>('PERPETUAL')
  const [customDays, setCustomDays] = useState<number>(365)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMessage) setErrorMessage('')
  }

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.shopName.trim()) {
      setErrorMessage('Showroom Name is required.')
      return false
    }
    if (!formData.ownerName.trim()) {
      setErrorMessage('Owner / Contact Name is required.')
      return false
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Phone Number is required.')
      return false
    }
    setErrorMessage('')
    return true
  }

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
    } else if (currentStep === 3) {
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    setErrorMessage('')
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)
    }
  }

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Copy all credentials to clipboard
  const handleCopyAll = () => {
    if (!credentials) return
    const bundle = `JEWELLERY ERP - SHOWROOM ONBOARDING CREDENTIALS
=====================================================
Shop ID:              ${credentials.shopId}
Showroom Name:        ${credentials.shopName}
Owner Name:           ${credentials.ownerName}
Edition:              ${credentials.edition} Suite
Master Admin User:    ${credentials.username}
Temporary Password:   ${credentials.temporaryPassword}
Product License Key:  ${credentials.productKey}
Master Recovery Key:  ${credentials.recoveryKey}
=====================================================
NOTICE: Please update temporary password upon initial launch. Store recovery key securely.`
    navigator.clipboard.writeText(bundle)
    setCopiedField('ALL')
    setTimeout(() => setCopiedField(null), 2500)
  }

  // PDF Download helper
  const handleDownloadPdf = async () => {
    if (!credentials) return
    try {
      setIsDownloadingPdf(true)
      await adminApi.downloadOnboardingPdf(credentials)
    } catch (err: any) {
      alert(`PDF download failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Submit Shop Creation
  const handleFinalSubmit = async () => {
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const payload: CreateShopPayload = {
        ...formData,
        validityDays: validityMode === 'CUSTOM' ? customDays : null
      }

      const res = await adminApi.createShop(payload)
      if (res.success && res.oneTimeCredentials) {
        setCredentials(res.oneTimeCredentials)
      } else {
        throw new Error(res.message || 'Creation failed')
      }
    } catch (err: any) {
      console.error('Shop creation error:', err)
      setErrorMessage(err.message || 'Failed to provision shop. Check backend connectivity.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <Header title="Provision New Showroom" />

      <main className="p-8 max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/shops" className="hover:text-amber-600 transition-colors">
            Showroom Management
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900">New Showroom Wizard</span>
        </div>

        {/* Wizard Progress Stepper */}
        {!credentials && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="grid grid-cols-4 gap-4 relative">
              {/* Step 1 Indicator */}
              <div
                className={`flex flex-col items-center text-center gap-2 ${
                  currentStep >= 1 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep === 1
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-4 ring-amber-100'
                      : currentStep > 1
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Shop Info</p>
                  <p className="text-[10px] text-slate-400 hidden sm:block">Details &amp; Location</p>
                </div>
              </div>

              {/* Step 2 Indicator */}
              <div
                className={`flex flex-col items-center text-center gap-2 ${
                  currentStep >= 2 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep === 2
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-4 ring-amber-100'
                      : currentStep > 2
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Owner Account</p>
                  <p className="text-[10px] text-slate-400 hidden sm:block">Access Identity</p>
                </div>
              </div>

              {/* Step 3 Indicator */}
              <div
                className={`flex flex-col items-center text-center gap-2 ${
                  currentStep >= 3 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep === 3
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-4 ring-amber-100'
                      : currentStep > 3
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > 3 ? <CheckCircle className="w-4 h-4" /> : '3'}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Product License</p>
                  <p className="text-[10px] text-slate-400 hidden sm:block">Ed25519 &amp; Binding</p>
                </div>
              </div>

              {/* Step 4 Indicator */}
              <div
                className={`flex flex-col items-center text-center gap-2 ${
                  currentStep === 4 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep === 4
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-4 ring-amber-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  4
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Review &amp; Create</p>
                  <p className="text-[10px] text-slate-400 hidden sm:block">Issue Credentials</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* STEP 1: SHOP INFORMATION */}
        {!credentials && currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-600" />
                Showroom Profile &amp; Location
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the legal business details for the commercial showroom.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Showroom / Firm Name *
                </label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleInputChange}
                  placeholder="e.g. Navratan Jewellers &amp; Sons"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Proprietor / Owner Name *
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="e.g. Ramesh Chandra Verma"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Official Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. contact@navratanjewels.com"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  GSTIN (Tax ID)
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleInputChange}
                  placeholder="e.g. 27AABCV1234D1Z5"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 uppercase outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. 104 Zaveri Bazaar, Gold Souk"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Mumbai"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  State / Province
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="e.g. Maharashtra"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  PIN Code
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="e.g. 400002"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Business Operation Type
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-semibold"
                >
                  <option value="RETAIL">Retail Jewellery Showroom</option>
                  <option value="WHOLESALE">Wholesale Bullion / Manufacturer</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleNext}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <span>Continue to Owner Account</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: OWNER ACCOUNT */}
        {!credentials && currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-amber-600" />
                Master Owner Identity &amp; Credentials
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure the primary administrative login for this showroom terminal.
              </p>
            </div>

            <div className="space-y-5">
              {/* System Generated Preview Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  System-Generated Identifiers Preview
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400">Node / Shop ID:</span>{' '}
                    <span className="font-mono font-bold text-slate-700">Auto-assigned (e.g. JERP-7281-9042)</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Suggested Username:</span>{' '}
                    <span className="font-mono font-bold text-slate-700">
                      {formData.customUsername ||
                        `owner_${formData.shopName
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '')
                          .slice(0, 10) || 'jeweller'}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Master Owner Username (Optional Customization)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="customUsername"
                    value={formData.customUsername}
                    onChange={handleInputChange}
                    placeholder="Leave empty for auto-generated suggested username"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  If left blank, the system creates a clean alphanumeric username based on the showroom name.
                </p>
              </div>

              {/* Cryptographic Secrets Advisory */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Cryptographic Credentials Issuance Policy
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Upon creation, the secure backend generates:
                </p>
                <ul className="list-disc pl-5 text-amber-800 space-y-1">
                  <li>
                    <strong>Temporary Master Password:</strong> Generated via high-entropy entropy bytes; required to be changed on first terminal login.
                  </li>
                  <li>
                    <strong>Master Recovery Key:</strong> Secure 16-character offline recovery string for resetting credentials without online connectivity.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBack}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <span>Continue to License Policy</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PRODUCT LICENSE */}
        {!credentials && currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                Product Licensing &amp; Terminal Binding
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure the tier, terminal locking quota, and validity horizon.
              </p>
            </div>

            <div className="space-y-6">
              {/* Edition Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Jewellery ERP Edition
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['BASIC', 'PROFESSIONAL', 'ENTERPRISE'] as const).map((tier) => (
                    <div
                      key={tier}
                      onClick={() => setFormData((prev) => ({ ...prev, edition: tier }))}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.edition === tier
                          ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{tier}</span>
                        {formData.edition === tier && <CheckCircle className="w-4 h-4 text-amber-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {tier === 'BASIC'
                          ? 'Single billing counter, basic billing & stock.'
                          : tier === 'PROFESSIONAL'
                          ? 'Complete wholesale/retail billing, barcode & ledger.'
                          : 'Full ERP suite, multi-vault, accounts & analytics.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workstation Machine Lock */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Allowed Workstation Devices
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    name="maxAllowedMachines"
                    value={formData.maxAllowedMachines}
                    onChange={handleInputChange}
                    className="w-24 h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-500">
                    Primary device hardware binding limit (locked to first activated PC).
                  </span>
                </div>
              </div>

              {/* License Validity Horizon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  License Expiration Horizon
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setValidityMode('PERPETUAL')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      validityMode === 'PERPETUAL'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Perpetual / Lifetime
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                      No automated expiration date
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidityMode('CUSTOM')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      validityMode === 'CUSTOM'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Subscription Horizon
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                      Expires after fixed duration
                    </span>
                  </button>
                </div>

                {validityMode === 'CUSTOM' && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="number"
                      min={30}
                      max={1825}
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value) || 365)}
                      className="w-32 h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold outline-none"
                    />
                    <span className="text-xs text-slate-500">Days from issuance date (e.g. 365 days = 1 year)</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Administrative Notes / Contract Reference
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="e.g. Annual commercial maintenance contract #2026-NVR"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBack}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <span>Review &amp; Verify</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CREATE */}
        {!credentials && currentStep === 4 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                Review &amp; Authorize Provisioning
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Verify showroom parameters before generating permanent cryptographic keys.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Showroom Profile</p>
                <p className="text-slate-900 font-bold text-sm">{formData.shopName}</p>
                <p className="text-slate-600">Owner: {formData.ownerName}</p>
                <p className="text-slate-600">Phone: {formData.phone}</p>
                {formData.email && <p className="text-slate-600">Email: {formData.email}</p>}
                {formData.gstin && <p className="text-slate-600">GSTIN: {formData.gstin}</p>}
                <p className="text-slate-600">
                  Location: {[formData.city, formData.state].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Licensing &amp; Identity</p>
                <p className="text-slate-900 font-bold text-sm">
                  {formData.edition} Suite ({formData.businessType})
                </p>
                <p className="text-slate-600">
                  Target Username:{' '}
                  <span className="font-mono font-bold">
                    {formData.customUsername || '(System Generated)'}
                  </span>
                </p>
                <p className="text-slate-600">Workstation Device Limit: {formData.maxAllowedMachines} PC</p>
                <p className="text-slate-600">
                  Validity: {validityMode === 'PERPETUAL' ? 'Perpetual Lifetime' : `${customDays} Days`}
                </p>
                <p className="text-emerald-700 font-medium">Digital Signature: Ed25519 &amp; Argon2id</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-amber-400">Security Notice Upon Submission</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  The central licensing server will generate high-entropy secrets and return them strictly once.
                </p>
              </div>
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="h-11 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Generating Secure Keys...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Authorize &amp; Provision Showroom</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ONE-TIME CREDENTIAL ISSUANCE VIEW (After Successful 201 Created) */}
        {credentials && (
          <div className="bg-white rounded-2xl border-2 border-amber-500/50 p-6 sm:p-8 shadow-xl space-y-6">
            {/* Success Banner */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-6">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Showroom Successfully Provisioned!</h2>
              <p className="text-xs text-slate-500">
                Master identity and product license keys have been generated and registered in the licensing database.
              </p>
            </div>

            {/* High-Alert Warning Notice */}
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3.5 text-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold uppercase tracking-wider text-red-700">
                  Critical Security Warning: One-Time Issuance
                </p>
                <p className="text-red-800 leading-relaxed">
                  These plaintext credentials will <strong>NEVER</strong> be displayed again. For strict zero-knowledge security, passwords and keys are hashed with Argon2id and SHA-256 before storage in MongoDB. Download the official onboarding PDF or copy credentials now.
                </p>
              </div>
            </div>

            {/* Credentials Display Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shop ID */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>SHOWROOM NODE ID</span>
                  <button
                    onClick={() => handleCopy(credentials.shopId, 'SHOP_ID')}
                    className="text-amber-600 hover:text-amber-700 flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedField === 'SHOP_ID' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono font-bold text-sm text-slate-900">{credentials.shopId}</p>
              </div>

              {/* Owner Username */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>MASTER ADMIN USERNAME</span>
                  <button
                    onClick={() => handleCopy(credentials.username, 'USERNAME')}
                    className="text-amber-600 hover:text-amber-700 flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedField === 'USERNAME' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono font-bold text-sm text-slate-900">{credentials.username}</p>
              </div>

              {/* Temporary Password */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 mb-1">
                  <span>TEMPORARY PASSWORD</span>
                  <button
                    onClick={() => handleCopy(credentials.temporaryPassword, 'PASSWORD')}
                    className="text-amber-700 hover:text-amber-800 flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedField === 'PASSWORD' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono font-bold text-sm text-slate-900">{credentials.temporaryPassword}</p>
              </div>

              {/* Product License Key */}
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 mb-1">
                  <span>PRODUCT LICENSE KEY</span>
                  <button
                    onClick={() => handleCopy(credentials.productKey, 'PRODUCT_KEY')}
                    className="text-sky-700 hover:text-sky-800 flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedField === 'PRODUCT_KEY' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono font-bold text-sm text-sky-900">{credentials.productKey}</p>
              </div>

              {/* Master Recovery Key */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 mb-1">
                  <span>MASTER RECOVERY KEY (OFFLINE RESET)</span>
                  <button
                    onClick={() => handleCopy(credentials.recoveryKey, 'RECOVERY_KEY')}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedField === 'RECOVERY_KEY' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono font-bold text-sm text-emerald-900">{credentials.recoveryKey}</p>
                <p className="text-[10px] text-emerald-700 mt-1">
                  Keep in secure physical safe; used by showroom owner to reset password if forgotten.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex-1 sm:flex-none h-11 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>{copiedField === 'ALL' ? 'All Copied!' : 'Copy All Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Onboarding PDF'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push('/shops')}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Done &amp; View Showrooms</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}