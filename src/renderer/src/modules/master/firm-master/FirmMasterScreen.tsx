import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiBriefcase,
  FiSave,
  FiRotateCcw,
  FiX,
  FiAward,
  FiShield,
  FiCreditCard,
  FiFileText,
  FiPhone,
  FiMail,
  FiInfo,
  FiEye
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type TabType = 'showroom' | 'statutory' | 'banking' | 'billing'

const GST_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' }
]

const BUYBACK_PRESETS = [
  '2% melting deduction on 22K Hallmarked gold returns. 100% exchange on current gold board rate.',
  'Gold buyback at 98% of prevailing board rate. Silver ornaments buyback at 90% of prevailing rate.',
  '100% exchange on Diamond jewellery value against new jewellery. 90% cash refund on Diamond value.'
]

const TERMS_PRESETS = [
  '1. Goods once sold will not be exchanged or refunded without original tax invoice and warranty card.\n2. Weight and purity certified as per BIS Hallmarking standards with unique 6-digit HUID.\n3. Subject to local city jurisdiction only.',
  '1. Certified 100% BIS Hallmarked Jewellery.\n2. Making charges and stone weights are non-refundable.\n3. Stone weight deducted from gross weight at the time of sale.',
  '1. Cheques / RTGS / UPI transfers subject to realization.\n2. Repair orders not claimed within 90 days will be melted.'
]

const initialForm = {
  firmName: '',
  tagline: '',
  ownerName: '',
  address: '',
  city: '',
  state: '',
  stateCode: '',
  pincode: '',
  mobileNumber: '',
  whatsappNumber: '',
  email: '',
  gstNo: '',
  panNo: '',
  bisLicenseNo: '',
  hallmarkCenter: '',
  legalMetrologyNo: '',
  bankName: '',
  bankBranch: '',
  bankAccountNo: '',
  bankIfsc: '',
  bankAccountName: '',
  upiId: '',
  billTitle: 'SALE BILL',
  billPrefix: 'SL',
  terms: '',
  invoiceFooterNote: '',
  buybackPolicy: '',
  authorisedSignatory: '',
  logoUrl: '',
  active: true
}

export function FirmMasterScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [activeTab, setActiveTab] = useState<TabType>('showroom')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null)

  const alertTimerRef = useRef<number | null>(null)
  const firmNameRef = useRef<HTMLInputElement | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlert({ type, message })
    if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
    alertTimerRef.current = window.setTimeout(() => setAlert(null), 4000)
  }, [])

  const updateField = useCallback(
    <K extends keyof typeof initialForm>(field: K, value: (typeof initialForm)[K]): void => {
      setForm((prev) => {
        const next = { ...prev, [field]: value }

        // Auto-match state code if state is updated
        if (field === 'state' && typeof value === 'string') {
          const match = GST_STATES.find(
            (s) => s.name.toLowerCase() === value.trim().toLowerCase()
          )
          if (match) {
            next.stateCode = match.code
          }
        }

        // Auto-populate PAN from GSTIN if 15 chars
        if (field === 'gstNo' && typeof value === 'string') {
          const cleanGst = value.trim().toUpperCase()
          if (cleanGst.length >= 12 && !prev.panNo) {
            const extractedPan = cleanGst.substring(2, 12)
            if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(extractedPan)) {
              next.panNo = extractedPan
            }
          }
          if (cleanGst.length >= 2 && !prev.stateCode) {
            const stateCodePrefix = cleanGst.substring(0, 2)
            if (/^\d{2}$/.test(stateCodePrefix)) {
              next.stateCode = stateCodePrefix
              const matchState = GST_STATES.find((s) => s.code === stateCodePrefix)
              if (matchState && !prev.state) {
                next.state = matchState.name
              }
            }
          }
        }

        return next
      })
    },
    []
  )

  const loadFirm = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.firm.get()
      setForm({
        firmName: data.firmName || '',
        tagline: data.tagline || '',
        ownerName: data.ownerName || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        stateCode: data.stateCode || '',
        pincode: data.pincode || '',
        mobileNumber: data.mobileNumber || '',
        whatsappNumber: data.whatsappNumber || '',
        email: data.email || '',
        gstNo: data.gstNo || '',
        panNo: data.panNo || '',
        bisLicenseNo: data.bisLicenseNo || '',
        hallmarkCenter: data.hallmarkCenter || '',
        legalMetrologyNo: data.legalMetrologyNo || '',
        bankName: data.bankName || '',
        bankBranch: data.bankBranch || '',
        bankAccountNo: data.bankAccountNo || '',
        bankIfsc: data.bankIfsc || '',
        bankAccountName: data.bankAccountName || '',
        upiId: data.upiId || '',
        billTitle: data.billTitle || 'SALE BILL',
        billPrefix: data.billPrefix || 'SL',
        terms: data.terms || '',
        invoiceFooterNote: data.invoiceFooterNote || '',
        buybackPolicy: data.buybackPolicy || '',
        authorisedSignatory: data.authorisedSignatory || '',
        logoUrl: data.logoUrl || '',
        active: Boolean(data.active)
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const handleSave = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault()

    if (!form.firmName.trim()) {
      showAlert('warning', 'Please enter Firm / Showroom Name.')
      setActiveTab('showroom')
      firmNameRef.current?.focus()
      return
    }

    try {
      setSaving(true)
      await window.api.firm.save({
        firmName: form.firmName.trim(),
        tagline: form.tagline.trim(),
        ownerName: form.ownerName.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        stateCode: form.stateCode.trim(),
        pincode: form.pincode.trim(),
        mobileNumber: form.mobileNumber.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        email: form.email.trim(),
        gstNo: form.gstNo.trim().toUpperCase(),
        panNo: form.panNo.trim().toUpperCase(),
        bisLicenseNo: form.bisLicenseNo.trim().toUpperCase(),
        hallmarkCenter: form.hallmarkCenter.trim(),
        legalMetrologyNo: form.legalMetrologyNo.trim().toUpperCase(),
        bankName: form.bankName.trim(),
        bankBranch: form.bankBranch.trim(),
        bankAccountNo: form.bankAccountNo.trim(),
        bankIfsc: form.bankIfsc.trim().toUpperCase(),
        bankAccountName: form.bankAccountName.trim(),
        upiId: form.upiId.trim(),
        billTitle: form.billTitle.trim() || 'SALE BILL',
        billPrefix: form.billPrefix.trim().toUpperCase() || 'SL',
        terms: form.terms.trim(),
        invoiceFooterNote: form.invoiceFooterNote.trim(),
        buybackPolicy: form.buybackPolicy.trim(),
        authorisedSignatory: form.authorisedSignatory.trim(),
        logoUrl: form.logoUrl.trim(),
        active: form.active
      })

      showAlert('success', 'Firm Master details saved and updated successfully.')
      window.dispatchEvent(new CustomEvent('erp:firm-updated'))
      await loadFirm()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    void loadFirm()
    return () => {
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
    }
  }, [loadFirm])

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* ── Alert Area ── */}
      {alert && (
        <div className="px-6 pt-3 shrink-0">
          <AppAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      {/* ── Main Tabbed Content Area ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-w-7xl mx-auto">
          {/* Left / Main Configuration Column */}
          <div className="xl:col-span-8 flex flex-col gap-0">
            {/* Navigation Tabs Bar */}
            <div className="flex items-center justify-between border border-b-0 border-slate-200 bg-white px-3 py-2.5 rounded-t-xl shadow-2xs">
              <div className="flex items-center gap-2 overflow-x-auto flex-nowrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('showroom')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'showroom'
                      ? 'bg-amber-500 !text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FiBriefcase size={14} className={`shrink-0 ${activeTab === 'showroom' ? '!text-white' : ''}`} />
                  <span className={`whitespace-nowrap ${activeTab === 'showroom' ? '!text-white' : ''}`}>
                    1. Showroom Profile
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('statutory')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'statutory'
                      ? 'bg-amber-500 !text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FiShield size={14} className={`shrink-0 ${activeTab === 'statutory' ? '!text-white' : ''}`} />
                  <span className={`whitespace-nowrap ${activeTab === 'statutory' ? '!text-white' : ''}`}>
                    2. Tax & BIS Hallmark
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('banking')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'banking'
                      ? 'bg-amber-500 !text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FiCreditCard size={14} className={`shrink-0 ${activeTab === 'banking' ? '!text-white' : ''}`} />
                  <span className={`whitespace-nowrap ${activeTab === 'banking' ? '!text-white' : ''}`}>
                    3. Bank & UPI QR
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'billing'
                      ? 'bg-amber-500 !text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FiFileText size={14} className={`shrink-0 ${activeTab === 'billing' ? '!text-white' : ''}`} />
                  <span className={`whitespace-nowrap ${activeTab === 'billing' ? '!text-white' : ''}`}>
                    4. Bill & Terms Print
                  </span>
                </button>
              </div>

              {onClose && (
                <div className="flex items-center pl-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Close"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Showroom Profile */}
            {activeTab === 'showroom' && (
              <div className="bg-white border-x border-slate-200 p-6 shadow-2xs flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Showroom Identity & Contact Details</h3>
                    <p className="text-xs text-slate-500">Legal store name, tagline, physical location and owner information</p>
                  </div>
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Primary Identity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Firm / Showroom Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={firmNameRef}
                        type="text"
                        value={form.firmName}
                        onChange={(e) => updateField('firmName', e.target.value)}
                        placeholder="e.g., Shree Mahalaxmi Jewellers Pvt. Ltd."
                        className="w-full pl-9 pr-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs"
                      />
                      <FiBriefcase className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Showroom Tagline / Slogan
                    </label>
                    <input
                      type="text"
                      value={form.tagline}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      placeholder="e.g., Pure Gold • Certified Diamonds • Timeless Trust"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Managing Director Name</label>
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={(e) => updateField('ownerName', e.target.value)}
                      placeholder="e.g., Rajeshbhai Verma"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Showroom Status</label>
                    <label className="flex items-center gap-2.5 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50/70 cursor-pointer text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => updateField('active', e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                      />
                      <span>Active Operating Showroom</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Mobile Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={form.mobileNumber}
                        onChange={(e) => updateField('mobileNumber', e.target.value)}
                        placeholder="e.g., +91 98765 43210"
                        className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                      />
                      <FiPhone className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Business Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={form.whatsappNumber}
                        onChange={(e) => updateField('whatsappNumber', e.target.value)}
                        placeholder="e.g., 9876543210"
                        className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                      />
                      <FiPhone className="absolute left-3 top-2.5 text-emerald-500" size={14} />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="e.g., info@shreejewellers.com"
                        className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                      />
                      <FiMail className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Shop / Building Address</label>
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="e.g., Shop No. 12-14, Ground Floor, Zaveri Bazaar, Kalbadevi"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="e.g., Mumbai"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State / Province</label>
                    <select
                      value={form.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 cursor-pointer"
                    >
                      <option value="">Select State</option>
                      {GST_STATES.map((st) => (
                        <option key={st.code} value={st.name}>
                          {st.name} ({st.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GST State Code (2-Digit) <span className="text-amber-600 font-normal">(Auto-matched)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={form.stateCode}
                      onChange={(e) => updateField('stateCode', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g., 27"
                      className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={form.pincode}
                      onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g., 400002"
                      className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Tax & BIS Hallmark */}
            {activeTab === 'statutory' && (
              <div className="bg-white border-x border-slate-200 p-6 shadow-2xs flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tax Registrations & BIS Hallmark Licensing</h3>
                    <p className="text-xs text-slate-500">
                      Required for GST invoice compliance, Hallmarking logo certification, and Legal Metrology scale verification
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Statutory Compliance
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GSTIN / GST Registration No.
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={form.gstNo}
                      onChange={(e) => updateField('gstNo', e.target.value.toUpperCase())}
                      placeholder="e.g., 27AAAAA0000A1Z5"
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold tracking-wider border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">15-character alphanumeric GSTIN</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Permanent Account Number (PAN)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={form.panNo}
                      onChange={(e) => updateField('panNo', e.target.value.toUpperCase())}
                      placeholder="e.g., AAAAA0000A"
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold tracking-wider border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">10-digit income tax PAN</span>
                  </div>

                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 md:col-span-2 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <FiAward size={16} className="text-amber-600 shrink-0" />
                      <span>BIS Hallmarking License & Assaying Center (AHC)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          BIS Hallmark Registration / License No.
                        </label>
                        <input
                          type="text"
                          value={form.bisLicenseNo}
                          onChange={(e) => updateField('bisLicenseNo', e.target.value.toUpperCase())}
                          placeholder="e.g., HM/C-12345678"
                          className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                        />
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Mandatory on gold & silver hallmarked invoices
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Assaying & Hallmarking Centre (AHC) Name / Code
                        </label>
                        <input
                          type="text"
                          value={form.hallmarkCenter}
                          onChange={(e) => updateField('hallmarkCenter', e.target.value)}
                          placeholder="e.g., National Assaying & Hallmarking Centre (AHC-012)"
                          className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                        />
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Authorized testing centre certifying your HUID tags
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal Metrology (LM) / Weighing Scale Stamping Certificate No.
                    </label>
                    <input
                      type="text"
                      value={form.legalMetrologyNo}
                      onChange={(e) => updateField('legalMetrologyNo', e.target.value.toUpperCase())}
                      placeholder="e.g., LM/VER-2026/98765"
                      className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Department of Legal Metrology annual verification stamping certificate number
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Bank & UPI QR */}
            {activeTab === 'banking' && (
              <div className="bg-white border-x border-slate-200 p-6 shadow-2xs flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Showroom Bank Accounts & Instant UPI Payment QR</h3>
                    <p className="text-xs text-slate-500">
                      Printed on customer tax invoices for NEFT, RTGS, and instant UPI QR payments at counter
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Payment Gateway
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(e) => updateField('bankName', e.target.value)}
                      placeholder="e.g., HDFC Bank Ltd. / State Bank of India"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder / Firm Name</label>
                    <input
                      type="text"
                      value={form.bankAccountName}
                      onChange={(e) => updateField('bankAccountName', e.target.value)}
                      placeholder="e.g., Shree Mahalaxmi Jewellers"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={form.bankAccountNo}
                      onChange={(e) => updateField('bankAccountNo', e.target.value)}
                      placeholder="e.g., 50200012345678"
                      className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={form.bankIfsc}
                      onChange={(e) => updateField('bankIfsc', e.target.value.toUpperCase())}
                      placeholder="e.g., HDFC0001234"
                      className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name & City</label>
                    <input
                      type="text"
                      value={form.bankBranch}
                      onChange={(e) => updateField('bankBranch', e.target.value)}
                      placeholder="e.g., Zaveri Bazaar Main Branch, Mumbai"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 md:col-span-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                      <FiCreditCard size={16} className="text-emerald-600 shrink-0" />
                      <span>Instant UPI ID (Virtual Payment Address for Dynamic QR)</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.upiId}
                        onChange={(e) => updateField('upiId', e.target.value.trim())}
                        placeholder="e.g., shreejewellery@hdfcbank or 9876543210@upi"
                        className="flex-1 px-3.5 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-800">
                      When provided, customer sale invoices and payment receipts will generate a scannable UPI QR code.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Bill & Terms Print */}
            {activeTab === 'billing' && (
              <div className="bg-white border-x border-slate-200 p-6 shadow-2xs flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Invoice Numbering, Buyback Policy & Print Terms</h3>
                    <p className="text-xs text-slate-500">
                      Customize invoice titles, prefix series, gold return policies, and legal fine print
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Print Layout
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Bill Title</label>
                    <input
                      type="text"
                      value={form.billTitle}
                      onChange={(e) => updateField('billTitle', e.target.value)}
                      placeholder="e.g., TAX INVOICE / SALE BILL"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Serial Prefix</label>
                    <input
                      type="text"
                      value={form.billPrefix}
                      onChange={(e) => updateField('billPrefix', e.target.value.toUpperCase())}
                      placeholder="e.g., SL, SJ, RET"
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">Prefix attached before invoice numbers (e.g., SL-1001)</span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Authorised Signatory Title / Subtext
                    </label>
                    <input
                      type="text"
                      value={form.authorisedSignatory}
                      onChange={(e) => updateField('authorisedSignatory', e.target.value)}
                      placeholder="e.g., For Shree Mahalaxmi Jewellers • Authorised Signatory"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Gold & Silver Buyback / Exchange Policy</label>
                      <span className="text-[11px] text-slate-400">Printed on invoice footer</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {BUYBACK_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => updateField('buybackPolicy', preset)}
                          className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-md border border-slate-200 transition-colors cursor-pointer text-left"
                        >
                          Preset {idx + 1}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={form.buybackPolicy}
                      onChange={(e) => updateField('buybackPolicy', e.target.value)}
                      placeholder="e.g., 100% exchange on gold net weight at current market rate. 2% deduction on cash buyback."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Standard Terms & Conditions</label>
                      <span className="text-[11px] text-slate-400">Bill Terms</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {TERMS_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => updateField('terms', preset)}
                          className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-md border border-slate-200 transition-colors cursor-pointer text-left"
                        >
                          Standard Terms {idx + 1}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={form.terms}
                      onChange={(e) => updateField('terms', e.target.value)}
                      placeholder="e.g., 1. Goods once sold will not be returned.\n2. Certified 100% BIS Hallmarked.\n3. Subject to local jurisdiction."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400 font-mono text-[11px]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Invoice Footer Greetings Note
                    </label>
                    <input
                      type="text"
                      value={form.invoiceFooterNote}
                      onChange={(e) => updateField('invoiceFooterNote', e.target.value)}
                      placeholder="e.g., Thank you for shopping with us! Please visit again."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Footer for Left Column */}
            <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
              <button
                type="button"
                onClick={() => void loadFirm()}
                disabled={loading || saving}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Reload saved firm settings"
              >
                <FiRotateCcw size={14} className={loading ? 'animate-spin text-slate-600' : 'text-slate-600'} />
                <span>Reload</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading}
                className="px-5 py-2 text-xs font-semibold !text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <FiSave size={15} className="!text-white" />
                <span className="!text-white">{saving ? 'Saving...' : 'Save Firm Details'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Interactive Print Preview */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <FiEye size={15} className="text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">Live Bill Print Header Preview</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  A4 / Thermal
                </span>
              </div>

              {/* Simulated Paper Bill Preview */}
              <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-lg p-4 font-sans text-slate-800 flex flex-col shadow-2xs">
                {/* Firm Header */}
                <div className="text-center border-b border-slate-200 pb-3 mb-3">
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                    {form.firmName || 'YOUR SHOWROOM NAME'}
                  </h2>
                  {form.tagline && (
                    <p className="text-[10px] text-amber-700 font-medium italic mt-0.5">{form.tagline}</p>
                  )}
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    {form.address || 'Shop No. 12, Main Jewellers Market'}
                    {form.city ? `, ${form.city}` : ''}
                    {form.state ? `, ${form.state}` : ''}
                    {form.pincode ? ` - ${form.pincode}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-x-2 text-[10px] text-slate-500 mt-1">
                    {form.mobileNumber && <span>📞 {form.mobileNumber}</span>}
                    {form.whatsappNumber && <span>💬 {form.whatsappNumber}</span>}
                    {form.email && <span>✉️ {form.email}</span>}
                  </div>
                </div>

                {/* Tax & Legal Badges */}
                <div className="grid grid-cols-2 gap-1 text-[10px] bg-white p-2 rounded border border-slate-200 mb-3">
                  <div>
                    <span className="text-slate-400 font-medium">GSTIN:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">{form.gstNo || '27AAAAA0000A1Z5'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">PAN:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">{form.panNo || 'AAAAA0000A'}</span>
                  </div>
                  {form.bisLicenseNo && (
                    <div className="col-span-2 text-amber-800 font-medium">
                      <span className="text-slate-400">BIS Hallmark Reg:</span>{' '}
                      <span className="font-mono font-bold">{form.bisLicenseNo}</span>
                    </div>
                  )}
                  {form.stateCode && (
                    <div className="col-span-2 text-slate-600">
                      <span className="text-slate-400">State:</span>{' '}
                      <span>
                        {form.state || 'Maharashtra'} ({form.stateCode})
                      </span>
                    </div>
                  )}
                </div>

                {/* Bill Title Banner */}
                <div className="text-center py-1 bg-slate-200/80 rounded font-bold text-xs uppercase text-slate-800 tracking-wider mb-3">
                  {form.billTitle || 'TAX INVOICE'}
                </div>

                {/* Simulated Item Row Sample */}
                <div className="border-t border-b border-slate-200 py-2 text-[10px] text-slate-500 flex justify-between">
                  <span>Sample Item: 22K Gold Ring (916 BIS)</span>
                  <span className="font-semibold text-slate-800">₹ 45,250.00</span>
                </div>

                {/* Banking Section Preview */}
                {(form.bankName || form.upiId) && (
                  <div className="mt-3 p-2 bg-white rounded border border-slate-200 text-[10px]">
                    <div className="font-bold text-slate-700 mb-0.5">Bank Payment Details:</div>
                    {form.bankName && (
                      <div className="text-slate-600">
                        {form.bankName} • A/C: <span className="font-mono font-semibold">{form.bankAccountNo || 'XXXX'}</span>
                      </div>
                    )}
                    {form.bankIfsc && (
                      <div className="text-slate-500 font-mono">IFSC: {form.bankIfsc}</div>
                    )}
                    {form.upiId && (
                      <div className="text-emerald-700 font-mono font-medium mt-1">
                        UPI QR: {form.upiId}
                      </div>
                    )}
                  </div>
                )}

                {/* Buyback & Terms Preview */}
                {form.buybackPolicy && (
                  <div className="mt-2 text-[9px] text-slate-600 leading-tight">
                    <span className="font-semibold text-slate-700">Buyback Policy:</span> {form.buybackPolicy}
                  </div>
                )}

                {/* Signatory */}
                <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-end text-[9px]">
                  <span className="text-slate-400">{form.invoiceFooterNote || 'Thank you! Visit again.'}</span>
                  <span className="font-semibold text-slate-700 text-right">
                    {form.authorisedSignatory || 'Authorised Signatory'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <FiInfo className="text-blue-500" size={15} />
                <span>Firm Profile Instructions</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  <strong>GST State Code</strong> ensures CGST/SGST vs IGST calculation is automatic.
                </li>
                <li>
                  <strong>BIS Hallmark No.</strong> prints on tax bills according to Hallmarking regulations.
                </li>
                <li>
                  <strong>UPI ID</strong> enables automatic QR payment collection at billing counters.
                </li>
              </ul>
              <div className="flex items-center gap-2 pt-1">
              
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loading}
                  className="flex-1 py-2.5 text-xs font-bold !text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FiSave size={15} className="!text-white" />
                  <span className="!text-white">{saving ? 'Saving...' : 'Save All Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FirmMasterScreen
