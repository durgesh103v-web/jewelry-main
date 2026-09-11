import React from 'react'
import { Select } from '@components/ui/select/Select'

export interface ItemFormValues {
  itemCode: string
  itemName: string
  metalType: string
  itemGroupId: string
  defaultStampId: string
  defaultDesignId: string
  purityKarat: string
  isStudded: boolean
  stoneDeductionType: string
  huidRequired: boolean
  minStockQty: string
  minStockWeight: string
  description: string
  barcodeItem: boolean
  barcodeType: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  gstRate: string
  fixedWeightPerPcs: string
  defaultTanch: string
  defaultWastage: string
  defaultLabourRate: string
  labourRateType: string
  active: boolean
}

export interface ItemGroupOption {
  id: string
  groupName: string
  metalType: string
  active: boolean
  prefix?: string
  hsnCode?: string
  gstRate?: number
  defaultPurity?: string
  defaultLabourRate?: number
  defaultLabourType?: string
  defaultWastage?: number
}

export interface ItemStampOption {
  id: string
  stampName: string
  metalType: string
  active: boolean
}

export interface ItemDesignOption {
  id: string
  designName: string
  metalType: string
  active: boolean
}

export interface ItemFormProps {
  form: ItemFormValues
  setForm: React.Dispatch<React.SetStateAction<ItemFormValues>>
  activeGroups: ItemGroupOption[]
  activeStamps: ItemStampOption[]
  activeDesigns: ItemDesignOption[]
  editingId: string | null
  saving: boolean
  onSave: () => void
  onCancel: () => void
  onMetalChange: (metal: string) => void
  itemNameRef?: React.RefObject<HTMLInputElement | null>
}

export function ItemForm({
  form,
  setForm,
  activeGroups,
  activeStamps,
  activeDesigns,
  editingId,
  saving,
  onSave,
  onCancel,
  onMetalChange,
  itemNameRef
}: ItemFormProps): React.JSX.Element {
  const updateForm = <K extends keyof ItemFormValues>(field: K, value: ItemFormValues[K]) => {
    setForm((curr) => ({ ...curr, [field]: value }))
  }

  const handleGroupChange = (groupId: string) => {
    const selectedGroup = activeGroups.find((g) => g.id === groupId)
    if (!selectedGroup) {
      updateForm('itemGroupId', groupId)
      return
    }

    setForm((curr) => {
      const updates: Partial<ItemFormValues> = { itemGroupId: groupId }
      if (selectedGroup.metalType) {
        updates.metalType = selectedGroup.metalType
      }
      if (selectedGroup.hsnCode) {
        updates.gstHsnCode = selectedGroup.hsnCode
      }
      if (selectedGroup.gstRate !== undefined && selectedGroup.gstRate !== null) {
        updates.gstRate = String(selectedGroup.gstRate)
      }
      if (selectedGroup.defaultPurity) {
        updates.purityKarat = selectedGroup.defaultPurity
        let autoTanch = curr.defaultTanch
        if (selectedGroup.defaultPurity === '24K' || selectedGroup.defaultPurity === '999') autoTanch = '99.9'
        else if (selectedGroup.defaultPurity === '22K') autoTanch = '91.6'
        else if (selectedGroup.defaultPurity === '18K') autoTanch = '75'
        else if (selectedGroup.defaultPurity === '14K') autoTanch = '58.5'
        else if (selectedGroup.defaultPurity === '9K') autoTanch = '37.5'
        else if (selectedGroup.defaultPurity === '925') autoTanch = '92.5'
        else if (selectedGroup.defaultPurity === '800') autoTanch = '80'
        else if (selectedGroup.defaultPurity === '700') autoTanch = '70'
        else if (selectedGroup.defaultPurity === 'Pt950') autoTanch = '95'
        else if (selectedGroup.defaultPurity === 'Pt900') autoTanch = '90'
        updates.defaultTanch = autoTanch
      }
      if (selectedGroup.defaultLabourRate) {
        updates.defaultLabourRate = String(selectedGroup.defaultLabourRate)
      }
      if (selectedGroup.defaultLabourType) {
        updates.labourChargesBy =
          selectedGroup.defaultLabourType === 'PER_PIECE'
            ? 'PER_PIECE'
            : selectedGroup.defaultLabourType === 'PERCENT'
              ? 'PERCENT'
              : 'PER_GRAM'
      }
      if (selectedGroup.defaultWastage) {
        updates.defaultWastage = String(selectedGroup.defaultWastage)
      }
      if (selectedGroup.prefix && !curr.itemCode && !editingId) {
        updates.itemCode = selectedGroup.prefix
      }
      return { ...curr, ...updates }
    })
  }

  const updateAmountField = (field: keyof ItemFormValues, value: string) => {
    if (!/^\d*\.?\d*$/.test(value)) return
    updateForm(field, value as any)
  }

  const getPurityPresets = (metal: string) => {
    if (metal === 'Gold') {
      return [
        { label: 'Select Karat / Purity Preset', value: '' },
        { label: '24K (99.9% Fine Gold)', value: '24K' },
        { label: '22K (91.6% Hallmark 916)', value: '22K' },
        { label: '18K (75.0% 750)', value: '18K' },
        { label: '14K (58.5% 585)', value: '14K' },
        { label: '9K (37.5%)', value: '9K' },
        { label: 'Custom Purity', value: 'Custom' }
      ]
    }
    if (metal === 'Silver') {
      return [
        { label: 'Select Purity Preset', value: '' },
        { label: 'Silver 99.9% (Fine)', value: '999' },
        { label: 'Silver 92.5% (Sterling 925)', value: '925' },
        { label: 'Silver 80.0%', value: '800' },
        { label: 'Silver 70.0%', value: '700' },
        { label: 'Custom Purity', value: 'Custom' }
      ]
    }
    if (metal === 'Platinum') {
      return [
        { label: 'Select Purity Preset', value: '' },
        { label: 'Platinum 950 (95.0%)', value: 'Pt950' },
        { label: 'Platinum 900 (90.0%)', value: 'Pt900' },
        { label: 'Custom Purity', value: 'Custom' }
      ]
    }
    return [
      { label: 'Select Purity Preset', value: '' },
      { label: 'Standard (100%)', value: '100' },
      { label: 'Custom Purity', value: 'Custom' }
    ]
  }

  const handleKaratPresetChange = (karatVal: string) => {
    let autoTanch = form.defaultTanch
    if (karatVal === '24K' || karatVal === '999') autoTanch = '99.9'
    else if (karatVal === '22K') autoTanch = '91.6'
    else if (karatVal === '18K') autoTanch = '75'
    else if (karatVal === '14K') autoTanch = '58.5'
    else if (karatVal === '9K') autoTanch = '37.5'
    else if (karatVal === '925') autoTanch = '92.5'
    else if (karatVal === '800') autoTanch = '80'
    else if (karatVal === '700') autoTanch = '70'
    else if (karatVal === 'Pt950') autoTanch = '95'
    else if (karatVal === 'Pt900') autoTanch = '90'
    else if (karatVal === '100') autoTanch = '100'

    setForm((curr) => ({
      ...curr,
      purityKarat: karatVal,
      defaultTanch: autoTanch
    }))
  }

  const inputClass =
    'w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 transition-all placeholder:text-slate-400'

  const hishobValue = (
    Number(form.defaultTanch || 0) + Number(form.defaultWastage || 0)
  ).toFixed(3)

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
              {editingId ? `Edit Item: ${form.itemName || 'Untitled'}` : 'Create New Item Master'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Configure metal purity presets, making charges, stone deductions, and HSN tax codes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          title="Cancel and close (Esc)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Form Body - Scrollable Sections */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Section 1: Item Identification & Grouping */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Item Identification &amp; Grouping
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Item Code / SKU Prefix
              </label>
              <input
                type="text"
                value={form.itemCode}
                onChange={(e) => updateForm('itemCode', e.target.value.toUpperCase())}
                placeholder="e.g. RNG-22K"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={itemNameRef}
                type="text"
                value={form.itemName}
                onChange={(e) => updateForm('itemName', e.target.value)}
                placeholder="e.g. Gold Ladies Ring 22K"
                className={inputClass}
                required
              />
            </div>

            <Select
              label="Metal Type"
              required
              value={form.metalType}
              onChange={(e) => onMetalChange(e.target.value)}
              options={[
                { label: 'GOLD', value: 'Gold' },
                { label: 'SILVER', value: 'Silver' },
                { label: 'PLATINUM', value: 'Platinum' },
                { label: 'DIAMOND', value: 'Diamond' },
                { label: 'GEMSTONE', value: 'Gemstone' },
                { label: 'IMITATION', value: 'Imitation' },
                { label: 'OTHER', value: 'Other' }
              ]}
            />

            <Select
              label="Item Group"
              required
              value={form.itemGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              placeholder="Select Item Group"
              options={activeGroups.map((g) => ({ label: g.groupName, value: g.id }))}
            />

            <Select
              label="Karat / Purity Shortcut"
              value={form.purityKarat}
              onChange={(e) => handleKaratPresetChange(e.target.value)}
              options={getPurityPresets(form.metalType)}
            />

            <Select
              label="Default Stamp / Hallmark"
              value={form.defaultStampId}
              onChange={(e) => updateForm('defaultStampId', e.target.value)}
              placeholder="Select Stamp"
              options={activeStamps.map((s) => ({ label: s.stampName, value: s.id }))}
            />

            <Select
              label="Default Design Pattern"
              value={form.defaultDesignId}
              onChange={(e) => updateForm('defaultDesignId', e.target.value)}
              placeholder="Select Design"
              options={activeDesigns.map((d) => ({ label: d.designName, value: d.id }))}
            />
          </div>
        </section>

        {/* Section 2: Sale & Making Calculation Defaults */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Sale &amp; Making Calculation Defaults
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Pack / Fixed Wt (Less Wt)
              </label>
              <input
                type="text"
                value={form.fixedWeightPerPcs}
                onChange={(e) => updateAmountField('fixedWeightPerPcs', e.target.value)}
                placeholder="0.000"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Default Tunch / Purity %
              </label>
              <input
                type="text"
                value={form.defaultTanch}
                onChange={(e) => updateAmountField('defaultTanch', e.target.value)}
                placeholder="91.60"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Default Wastage %
              </label>
              <input
                type="text"
                value={form.defaultWastage}
                onChange={(e) => updateAmountField('defaultWastage', e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-md">
              <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">
                Computed Hishob (Tunch + Wastage)
              </span>
              <span className="text-sm font-bold text-amber-900">{hishobValue}%</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Making / Labour Rate
              </label>
              <input
                type="text"
                value={form.defaultLabourRate}
                onChange={(e) => updateAmountField('defaultLabourRate', e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <Select
              label="Labour Rate Unit"
              value={form.labourRateType}
              onChange={(e) => updateForm('labourRateType', e.target.value)}
              options={[
                { label: 'Per Gram (Gm)', value: 'Gm' },
                { label: 'Per Kilogram (Kg)', value: 'Kg' },
                { label: 'Per Piece (Pcs)', value: 'Pcs' }
              ]}
            />

            <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                ℹ
              </div>
              <div className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Formula:</strong> Net Wt = Gross - Less Wt &middot; Hishob = Tunch + Wastage &middot; Fine = (Net Wt &times; Hishob) / 100.
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Studded & Stone Management */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Studded &amp; Stone Management
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Select
              label="Contains Stones / Diamonds?"
              value={form.isStudded ? 'Yes' : 'No'}
              onChange={(e) => updateForm('isStudded', e.target.value === 'Yes')}
              options={[
                { label: 'No (Plain Metal)', value: 'No' },
                { label: 'Yes (Studded / Diamond / Gemstone)', value: 'Yes' }
              ]}
            />

            <div className="md:col-span-2">
              <Select
                label="Stone Deduction Rule at Billing"
                value={form.stoneDeductionType}
                onChange={(e) => updateForm('stoneDeductionType', e.target.value)}
                options={[
                  { label: 'None (No automatic stone deduction)', value: 'None' },
                  { label: 'Gross - Stone = Net (Auto deduct stone weight)', value: 'Gross - Stone = Net' },
                  { label: 'Manual Deduction on Counter', value: 'Manual' }
                ]}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Billing, Compliance & GST */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Billing, Compliance &amp; GST Engine
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              label="BIS Hallmark / HUID Required?"
              value={form.huidRequired ? 'Yes' : 'No'}
              onChange={(e) => updateForm('huidRequired', e.target.value === 'Yes')}
              options={[
                { label: 'No', value: 'No' },
                { label: 'Yes (Mandatory 6-digit HUID)', value: 'Yes' }
              ]}
            />

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                GST HSN Code
              </label>
              <input
                type="text"
                value={form.gstHsnCode}
                onChange={(e) => updateForm('gstHsnCode', e.target.value)}
                placeholder="e.g. 7113"
                className={inputClass}
              />
            </div>

            <Select
              label="GST Tax Rate (%)"
              value={form.gstRate}
              onChange={(e) => updateForm('gstRate', e.target.value)}
              options={[
                { label: '3% (Jewellery Standard)', value: '3' },
                { label: '5% (Jobwork / Making)', value: '5' },
                { label: '18% (Imitation / Services)', value: '18' },
                { label: '12%', value: '12' },
                { label: '0.25% (Rough Gemstone)', value: '0.25' },
                { label: '0% (Exempt)', value: '0' }
              ]}
            />

            <Select
              label="Barcode Item"
              value={form.barcodeItem ? 'Yes' : 'No'}
              onChange={(e) => {
                const isBarcode = e.target.value === 'Yes'
                setForm((curr) => ({
                  ...curr,
                  barcodeItem: isBarcode,
                  barcodeType: isBarcode ? curr.barcodeType || 'CODE128' : ''
                }))
              }}
              options={[
                { label: 'No', value: 'No' },
                { label: 'Yes', value: 'Yes' }
              ]}
            />

            <Select
              label="Barcode Type"
              disabled={!form.barcodeItem}
              value={form.barcodeType}
              onChange={(e) => updateForm('barcodeType', e.target.value)}
              options={[
                { label: 'None', value: '' },
                { label: 'CODE 128 (Standard Tag)', value: 'CODE128' },
                { label: 'QR Code (Compact 2D)', value: 'QR' },
                { label: 'EAN 13', value: 'EAN13' }
              ]}
            />

            <Select
              label="Labour Charges By"
              value={form.labourChargesBy}
              onChange={(e) => updateForm('labourChargesBy', e.target.value)}
              options={[
                { label: 'Per Gram (Gm)', value: 'Gm' },
                { label: 'Per Kilogram (Kg)', value: 'Kg' },
                { label: 'Per Piece (Pcs)', value: 'Pcs' }
              ]}
            />

            <Select
              label="Sale / Purchase Mode"
              value={form.salePurchaseBy}
              onChange={(e) => updateForm('salePurchaseBy', e.target.value)}
              options={[
                { label: 'Fine Weight', value: 'Fine' },
                { label: 'Gross/Net Weight', value: 'Weight' },
                { label: 'By Pieces', value: 'Pcs' }
              ]}
            />
          </div>
        </section>

        {/* Section 5: Stock Control & Specifications */}
        <section>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              5. Stock Control &amp; Specifications
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Min Stock Alert (Pieces)
              </label>
              <input
                type="text"
                value={form.minStockQty}
                onChange={(e) => updateAmountField('minStockQty', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Min Stock Alert (Grams)
              </label>
              <input
                type="text"
                value={form.minStockWeight}
                onChange={(e) => updateAmountField('minStockWeight', e.target.value)}
                placeholder="0.000"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Description / Remarks / Spec
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="e.g. Handcrafted, antique polish, CZ studded"
                className={inputClass}
              />
            </div>
          </div>

          {/* Active Checkbox */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateForm('active', e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
              />
              <span>Active Item (Available for Billing &amp; Inventory)</span>
            </label>
          </div>
        </section>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50/80 shrink-0">
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono text-slate-700 font-semibold mr-1">
              Ctrl+S
            </kbd>
            Save
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono text-slate-700 font-semibold mr-1">
              Esc
            </kbd>
            Cancel
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-9 px-4 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-amber-600 hover:bg-amber-700 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            style={{ color: '#ffffff' }}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="!text-white text-white font-semibold" style={{ color: '#ffffff' }}>
                  Saving...
                </span>
              </>
            ) : (
              <span className="!text-white text-white font-semibold" style={{ color: '#ffffff' }}>
                {editingId ? 'Update Item' : 'Save Item'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
