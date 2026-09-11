import React from 'react'
import { Select } from '@components/ui/select/Select'

export interface ItemGroupFormValues {
  groupName: string
  metalType: string
  description: string
  active: boolean
  prefix: string
  hsnCode: string
  gstRate: string
  defaultPurity: string
  defaultLabourRate: string
  defaultLabourType: 'PER_GRAM' | 'PER_PIECE' | 'PERCENT'
  defaultWastage: string
}

export interface ItemGroupFormProps {
  form: ItemGroupFormValues
  setForm: React.Dispatch<React.SetStateAction<ItemGroupFormValues>>
  editingId: string | null
  saving: boolean
  onSave: (andNew?: boolean) => void
  onCancel: () => void
  groupNameRef?: React.RefObject<HTMLInputElement | null>
}

export function ItemGroupForm({
  form,
  setForm,
  editingId,
  saving,
  onSave,
  onCancel,
  groupNameRef
}: ItemGroupFormProps): React.JSX.Element {
  const updateForm = <K extends keyof ItemGroupFormValues>(field: K, value: ItemGroupFormValues[K]) => {
    setForm((curr) => ({ ...curr, [field]: value }))
  }

  const getPurityOptions = () => {
    if (form.metalType === 'Gold') {
      return [
        { label: 'Select Default Purity', value: '' },
        { label: '24K (99.9% Fine Gold)', value: '24K' },
        { label: '22K (91.6% Hallmark 916)', value: '22K' },
        { label: '18K (75.0% 750)', value: '18K' },
        { label: '14K (58.5% 585)', value: '14K' },
        { label: '9K (37.5%)', value: '9K' }
      ]
    }
    if (form.metalType === 'Silver') {
      return [
        { label: 'Select Default Purity', value: '' },
        { label: 'Silver 99.9% (Fine)', value: '999' },
        { label: 'Silver 92.5% (Sterling 925)', value: '925' },
        { label: 'Silver 80.0%', value: '800' },
        { label: 'Silver 70.0%', value: '700' }
      ]
    }
    if (form.metalType === 'Diamond') {
      return [
        { label: 'Select Default Purity', value: '' },
        { label: '18K Gold Studded', value: '18K' },
        { label: '14K Gold Studded', value: '14K' },
        { label: 'Platinum Pt950 Studded', value: 'Pt950' }
      ]
    }
    if (form.metalType === 'Platinum') {
      return [
        { label: 'Select Default Purity', value: '' },
        { label: 'Platinum Pt950 (95.0%)', value: 'Pt950' },
        { label: 'Platinum Pt900 (90.0%)', value: 'Pt900' }
      ]
    }
    return [
      { label: 'Select Default Purity', value: '' },
      { label: 'Standard (100%)', value: '100' }
    ]
  }

  const inputClass =
    'w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 transition-all placeholder:text-slate-400'

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Form Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shadow-sm border border-amber-200">
            {editingId ? '✎' : '+'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {editingId ? `Edit Group: ${form.groupName || 'Untitled'}` : 'Create New Item Group'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Configure classification, category code, and default parameters for jewellery products
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          title="Close Form (Esc)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Form Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Section 1: Basic Information */}
        <section className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Basic Group Details
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={groupNameRef}
                type="text"
                value={form.groupName}
                onChange={(e) => updateForm('groupName', e.target.value)}
                placeholder="e.g. Gold Rings, Diamond Bangles, Silver Payal"
                className={inputClass}
                required
              />
            </div>

            <Select
              label="Metal Type"
              required
              value={form.metalType}
              onChange={(e) => {
                const newMetal = e.target.value
                setForm((curr) => ({
                  ...curr,
                  metalType: newMetal,
                  hsnCode: '7113',
                  gstRate: newMetal === 'Diamond' ? '1.5' : '3.0',
                  defaultPurity: newMetal === 'Gold' ? '22K' : newMetal === 'Silver' ? '925' : ''
                }))
              }}
              options={[
                { label: 'GOLD', value: 'Gold' },
                { label: 'SILVER', value: 'Silver' },
                { label: 'DIAMOND', value: 'Diamond' },
                { label: 'PLATINUM', value: 'Platinum' },
                { label: 'OTHER', value: 'Other' }
              ]}
            />

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Category Code / Prefix
              </label>
              <input
                type="text"
                value={form.prefix}
                onChange={(e) => updateForm('prefix', e.target.value.toUpperCase())}
                placeholder="e.g. RNG, CHN, BGL"
                maxLength={10}
                className={inputClass}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Used for smart barcode prefixing</span>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Description / Notes
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Optional notes or specifications about this group"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Auto-fill Defaults for Item Master & POS */}
        <section className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Item Master & Billing Auto-Fill Defaults
              </h4>
            </div>
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
              ⚡ Pre-fills when adding items in Item Master
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Default GST HSN Code
              </label>
              <input
                type="text"
                value={form.hsnCode}
                onChange={(e) => updateForm('hsnCode', e.target.value)}
                placeholder="7113"
                className={inputClass}
              />
            </div>

            <Select
              label="Default GST Tax Rate (%)"
              value={form.gstRate}
              onChange={(e) => updateForm('gstRate', e.target.value)}
              options={[
                { label: '3.0% (Gold & Silver Jewellery)', value: '3.0' },
                { label: '1.5% (Cut & Polished Diamonds)', value: '1.5' },
                { label: '5.0% (Special Goods)', value: '5.0' },
                { label: '18.0% (Labour / Jobwork)', value: '18.0' },
                { label: '0.0% (Exempt)', value: '0.0' }
              ]}
            />

            <Select
              label="Default Karat / Purity"
              value={form.defaultPurity}
              onChange={(e) => updateForm('defaultPurity', e.target.value)}
              options={getPurityOptions()}
            />

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Default Making / Labour Charge (₹)
              </label>
              <input
                type="number"
                value={form.defaultLabourRate}
                onChange={(e) => updateForm('defaultLabourRate', e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <Select
              label="Labour Calculation Type"
              value={form.defaultLabourType}
              onChange={(e) =>
                updateForm('defaultLabourType', e.target.value as 'PER_GRAM' | 'PER_PIECE' | 'PERCENT')
              }
              options={[
                { label: 'Per Gram (₹ / gm)', value: 'PER_GRAM' },
                { label: 'Per Piece (₹ / pc)', value: 'PER_PIECE' },
                { label: 'Percentage of Gold Value (%)', value: 'PERCENT' }
              ]}
            />

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Default Wastage Baseline (%)
              </label>
              <input
                type="number"
                value={form.defaultWastage}
                onChange={(e) => updateForm('defaultWastage', e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Status & Visibility */}
        <section className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Status & Visibility
            </h4>
          </div>

          <div>
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateForm('active', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/20 accent-amber-600"
              />
              <span className="text-xs font-semibold text-slate-700">
                Active Group (Visible in Item Master dropdowns & POS billing)
              </span>
            </label>
          </div>
        </section>
      </div>

      {/* Sticky Bottom Form Actions Toolbar */}
      <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-mono text-slate-600 shadow-2xs">
            Ctrl+S
          </kbd>
          <span>to save</span>
          <span className="mx-1 text-slate-300">·</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-mono text-slate-600 shadow-2xs">
            Esc
          </kbd>
          <span>to close</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-9 px-4 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
          >
            Cancel
          </button>

          {!editingId && (
            <button
              type="button"
              onClick={() => onSave(true)}
              disabled={saving}
              className="h-9 px-4 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
            >
              {saving ? 'Saving...' : 'Save & Add Another'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onSave(false)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 !text-white transition-colors shadow-sm focus:ring-2 focus:ring-amber-500/20"
            style={{ color: '#ffffff' }}
          >
            <span className="!text-white text-white font-semibold" style={{ color: '#ffffff' }}>
              {saving ? 'Saving...' : editingId ? 'Update Group' : 'Save Group'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
