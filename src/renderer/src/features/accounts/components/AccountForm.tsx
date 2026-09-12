import React from 'react'

export const ACCOUNT_TYPES = [
  'Wholesale Customer',
  'Supplier / Karagir / Dhadi',
  'Other / Expense / Pigmi / Kharch',
  'Bank Account',
  'Retail Customer'
]

export interface AccountFormValues {
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  openingGoldFine: string
  openingSilverFine: string
  openingCash: string
  openingAnamat: string
  openingBank: string
  lastDate: string
  goldFineLimit: string
  silverFineLimit: string
  creditLimit: string
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  bankName: string
  bankAccountNumber: string
  bankIfsc: string
  bankBranch: string
  gstNo: string
  panNo: string
  notification: string
  active: boolean
}

export interface AccountGroupOption {
  id: string
  groupName: string
  groupType: string
  active: boolean
}

export interface AccountFormProps {
  form: AccountFormValues
  setForm: React.Dispatch<React.SetStateAction<AccountFormValues>>
  activeGroups: AccountGroupOption[]
  editingId: string | null
  saving: boolean
  onSave: () => void
  onCancel: () => void
  accountNameRef: React.RefObject<HTMLInputElement | null>
}

export function AccountForm({
  form,
  setForm,
  activeGroups,
  editingId,
  saving,
  onSave,
  onCancel,
  accountNameRef
}: AccountFormProps): React.JSX.Element {
  const updateForm = (field: keyof AccountFormValues, value: string | boolean) => {
    setForm((curr) => ({ ...curr, [field]: value }))
  }

  const updateAmountField = (field: keyof AccountFormValues, value: string) => {
    if (!/^-?\d*\.?\d*$/.test(value)) return
    updateForm(field, value)
  }

  const toggleSign = (field: 'openingGoldFine' | 'openingSilverFine' | 'openingCash') => {
    const val = form[field]
    if (!val || val === '0') return
    if (val.startsWith('-')) {
      updateForm(field, val.substring(1))
    } else {
      updateForm(field, `-${val}`)
    }
  }

  const inputClass =
    'w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 transition-all placeholder:text-slate-400'

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Bar */}
     

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* 1. Basic Details */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
           
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Account Identification &amp; Grouping
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Account / Party Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={accountNameRef}
                type="text"
                value={form.accountName}
                onChange={(e) => updateForm('accountName', e.target.value)}
                placeholder="e.g. Ramesh Jewellers / Shri Bullion"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Alias / Contact Person
              </label>
              <input
                type="text"
                value={form.otherName}
                onChange={(e) => updateForm('otherName', e.target.value)}
                placeholder="e.g. Ramesh Bhai / Manager"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Account Type / Role
              </label>
              <select
                value={form.accountType}
                onChange={(e) => updateForm('accountType', e.target.value)}
                className={`${inputClass} cursor-pointer font-medium`}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Account Group <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.accountGroupId}
                onChange={(e) => updateForm('accountGroupId', e.target.value)}
                className={`${inputClass} cursor-pointer font-medium`}
                required
              >
                <option value="">Select Account Group</option>
                {activeGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.groupName} ({g.groupType})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 2. Opening Balances & Limits */}
        <section>
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
             
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Opening Balances &amp; Credit Limits
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Opening Pure Gold (Fine g)
                </label>
                {form.openingGoldFine && form.openingGoldFine !== '0' && (
                  <button
                    type="button"
                    onClick={() => toggleSign('openingGoldFine')}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Switch Payable (Dr) / Receivable (Cr)"
                  >
                    {form.openingGoldFine.startsWith('-') ? 'Receivable (Cr)' : 'Payable (Dr)'} ⇄
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingGoldFine}
                onChange={(e) => updateAmountField('openingGoldFine', e.target.value)}
                placeholder="0.000 (Use - for Lena/Cr)"
                className={`${inputClass} tabular-nums font-medium ${
                  form.openingGoldFine.startsWith('-') ? 'text-rose-700 bg-rose-50/30 font-bold' : ''
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Opening Pure Silver (Fine g)
                </label>
                {form.openingSilverFine && form.openingSilverFine !== '0' && (
                  <button
                    type="button"
                    onClick={() => toggleSign('openingSilverFine')}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Switch Payable (Dr) / Receivable (Cr)"
                  >
                    {form.openingSilverFine.startsWith('-') ? 'Receivable (Cr)' : 'Payable (Dr)'} ⇄
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingSilverFine}
                onChange={(e) => updateAmountField('openingSilverFine', e.target.value)}
                placeholder="0.000 (Use - for Lena/Cr)"
                className={`${inputClass} tabular-nums font-medium ${
                  form.openingSilverFine.startsWith('-') ? 'text-rose-700 bg-rose-50/30 font-bold' : ''
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Opening Cash Balance (₹)
                </label>
                {form.openingCash && form.openingCash !== '0' && (
                  <button
                    type="button"
                    onClick={() => toggleSign('openingCash')}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Switch Payable (Dr) / Receivable (Cr)"
                  >
                    {form.openingCash.startsWith('-') ? 'Receivable (Cr)' : 'Payable (Dr)'} ⇄
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingCash}
                onChange={(e) => updateAmountField('openingCash', e.target.value)}
                placeholder="0.00 (Use - for Lena/Cr)"
                className={`${inputClass} tabular-nums font-medium ${
                  form.openingCash.startsWith('-') ? 'text-rose-700 bg-rose-50/30 font-bold' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Anamat / Security Advance (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingAnamat}
                onChange={(e) => updateAmountField('openingAnamat', e.target.value)}
                placeholder="0.00 (Customer/Party Advance)"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Opening Bank Balance (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingBank}
                onChange={(e) => updateAmountField('openingBank', e.target.value)}
                placeholder="0.00"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Opening Balance Date
              </label>
              <input
                type="date"
                value={form.lastDate}
                onChange={(e) => updateForm('lastDate', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Max Gold Credit Limit (Pure g)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={form.goldFineLimit}
                onChange={(e) => updateAmountField('goldFineLimit', e.target.value)}
                placeholder="0.000 (Max gold grams allowed on credit)"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Max Silver Credit Limit (Pure g)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={form.silverFineLimit}
                onChange={(e) => updateAmountField('silverFineLimit', e.target.value)}
                placeholder="0.000 (Max silver grams allowed on credit)"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Max Cash Credit Limit (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={form.creditLimit}
                onChange={(e) => updateAmountField('creditLimit', e.target.value)}
                placeholder="0.00 (Max rupee amount allowed on credit)"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>
          </div>
        </section>

        {/* 3. Bank & Settlement Details */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Banking &amp; Electronic Settlement Details (NEFT / RTGS / UPI)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Bank Name
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => updateForm('bankName', e.target.value)}
                placeholder="e.g. State Bank of India / HDFC Bank"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Bank Account Number (A/C No)
              </label>
              <input
                type="text"
                value={form.bankAccountNumber}
                onChange={(e) => updateForm('bankAccountNumber', e.target.value)}
                placeholder="e.g. 5010023456789"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Bank IFSC Code
              </label>
              <input
                type="text"
                value={form.bankIfsc}
                onChange={(e) => updateForm('bankIfsc', e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Branch Name / UPI ID
              </label>
              <input
                type="text"
                value={form.bankBranch}
                onChange={(e) => updateForm('bankBranch', e.target.value)}
                placeholder="e.g. Zaveri Bazar / ramesh@upi"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* 4. Contact & Location */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
           
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Contact &amp; Postal Address
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Primary Mobile No.
              </label>
              <input
                type="text"
                value={form.mobileNumber}
                onChange={(e) => updateForm('mobileNumber', e.target.value)}
                placeholder="10-digit mobile number"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={form.whatsappNumber}
                onChange={(e) => updateForm('whatsappNumber', e.target.value)}
                placeholder="For PDF bills & ledger alerts"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Alternate Phone / Landline
              </label>
              <input
                type="text"
                value={form.phone2}
                onChange={(e) => updateForm('phone2', e.target.value)}
                placeholder="Office or residence phone"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="party@example.com (For e-invoices)"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Billing / Shop Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateForm('address', e.target.value)}
                placeholder="Shop No, Building, Street, Landmark"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                City / Town
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
                placeholder="e.g. Mumbai / Surat"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                State / Province
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateForm('state', e.target.value)}
                placeholder="e.g. Maharashtra (Determines CGST/SGST vs IGST)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Postal PIN Code
              </label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => updateForm('pincode', e.target.value)}
                placeholder="e.g. 400002"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* 5. Tax & Statutory Details */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
     
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              5. Taxation &amp; Compliance Details
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                GSTIN (15-Digit GST No)
              </label>
              <input
                type="text"
                value={form.gstNo}
                onChange={(e) => updateForm('gstNo', e.target.value.toUpperCase())}
                placeholder="27AAAAA0000A1Z5"
                className={`${inputClass} uppercase font-mono`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                PAN Card Number (10-Digit)
              </label>
              <input
                type="text"
                value={form.panNo}
                onChange={(e) => updateForm('panNo', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className={`${inputClass} uppercase font-mono`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Special Notes / Remarks
              </label>
              <input
                type="text"
                value={form.notification}
                onChange={(e) => updateForm('notification', e.target.value)}
                placeholder="Remarks, terms, or reminder note"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Account Status
              </label>
              <select
                value={form.active ? 'Yes' : 'No'}
                onChange={(e) => updateForm('active', e.target.value === 'Yes')}
                className={`${inputClass} cursor-pointer font-medium ${
                  form.active ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                <option value="Yes">Active (Enabled for Transactions)</option>
                <option value="No">Inactive (Disabled)</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Footer Actions */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-6 py-3.5 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-9 px-4 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-amber-600 hover:bg-amber-700 !text-white text-xs font-bold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
          style={{ color: '#ffffff' }}
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{editingId ? 'Updating...' : 'Saving...'}</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{editingId ? 'Update Account' : 'Save Account'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}