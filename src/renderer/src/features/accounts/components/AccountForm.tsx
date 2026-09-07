import React from 'react'
import { FormActions } from '@components/ui'

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
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  address: string
  city: string
  state: string
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

  const inputClass = "w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 transition-all placeholder:text-slate-400"

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shadow-sm border border-amber-200">
            {editingId ? '✎' : '+'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {editingId ? 'Edit Account' : 'Add New Account'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Manage account details, opening balances, and contact info.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* 1. Basic Details */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Basic Details</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Account Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={accountNameRef}
                type="text"
                value={form.accountName}
                onChange={(e) => updateForm('accountName', e.target.value)}
                placeholder="e.g. Ramesh Jewellers"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Other Name</label>
              <input
                type="text"
                value={form.otherName}
                onChange={(e) => updateForm('otherName', e.target.value)}
                placeholder="e.g. Ramesh Bhai"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Account Type</label>
              <select
                value={form.accountType}
                onChange={(e) => updateForm('accountType', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
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
                className={`${inputClass} cursor-pointer`}
                required
              >
                <option value="">Select Group</option>
                {activeGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.groupName} - {g.groupType}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 2. Opening Balance & Limits */}
        <section>
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Opening Balances &amp; Limits</h4>
            </div>
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
              Use positive for payable, negative (e.g. -5000) for receivable
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Gold Fine (g)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingGoldFine}
                onChange={(e) => updateAmountField('openingGoldFine', e.target.value)}
                placeholder="0.000 or -8000"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Silver Fine (g)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingSilverFine}
                onChange={(e) => updateAmountField('openingSilverFine', e.target.value)}
                placeholder="0.000 or -8000"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Cash (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingCash}
                onChange={(e) => updateAmountField('openingCash', e.target.value)}
                placeholder="0.00 or -8000"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Anamat (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.openingAnamat}
                onChange={(e) => updateAmountField('openingAnamat', e.target.value)}
                placeholder="0.00"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Bank (₹)</label>
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
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Last Date</label>
              <input
                type="date"
                value={form.lastDate}
                onChange={(e) => updateForm('lastDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Gold Fine Limit (g)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.goldFineLimit}
                onChange={(e) => updateAmountField('goldFineLimit', e.target.value)}
                placeholder="0.000"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Silver Fine Limit (g)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.silverFineLimit}
                onChange={(e) => updateAmountField('silverFineLimit', e.target.value)}
                placeholder="0.000"
                className={`${inputClass} tabular-nums font-medium`}
              />
            </div>
          </div>
        </section>

        {/* 3. Contact & Address */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Contact &amp; Location</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">WhatsApp Number</label>
              <input
                type="text"
                value={form.whatsappNumber}
                onChange={(e) => updateForm('whatsappNumber', e.target.value)}
                placeholder="10 digit mobile"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Phone 2</label>
              <input
                type="text"
                value={form.phone2}
                onChange={(e) => updateForm('phone2', e.target.value)}
                placeholder="Alternative phone"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateForm('address', e.target.value)}
                placeholder="Shop/House no, Street, Landmark"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
                placeholder="City"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateForm('state', e.target.value)}
                placeholder="State"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* 4. Tax & Statutory Details */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tax &amp; Statutory Details</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">GSTIN</label>
              <input
                type="text"
                value={form.gstNo}
                onChange={(e) => updateForm('gstNo', e.target.value.toUpperCase())}
                placeholder="27AAAAA0000A1Z5"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">PAN No.</label>
              <input
                type="text"
                value={form.panNo}
                onChange={(e) => updateForm('panNo', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Notification / Notes</label>
              <input
                type="text"
                value={form.notification}
                onChange={(e) => updateForm('notification', e.target.value)}
                placeholder="Reminder or account note"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select
                value={form.active ? 'Yes' : 'No'}
                onChange={(e) => updateForm('active', e.target.value === 'Yes')}
                className={`${inputClass} cursor-pointer font-medium ${form.active ? 'text-emerald-700' : 'text-slate-500'}`}
              >
                <option value="Yes">Active</option>
                <option value="No">Inactive</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50">
        <FormActions
          onSave={onSave}
          saveLabel={editingId ? 'Update Account' : 'Save Account'}
          loading={saving}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}