import React from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  Input,
  Select,
  Button,
  FormSection,
  FormField,
  FormActions
} from '@components/ui'
import { UNITS } from '@shared/constants'

export interface ItemFormValues {
  itemName: string
  metalType: string
  itemGroupId: string
  defaultStampId: string
  defaultDesignId: string
  barcodeItem: boolean
  barcodeType: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
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
  onNew: () => void
  onMetalChange: (metal: string) => void
  itemNameInputRef: React.RefObject<HTMLInputElement | null>
  metalTypeSelectRef: React.RefObject<HTMLSelectElement | null>
  itemGroupSelectRef: React.RefObject<HTMLSelectElement | null>
  stampSelectRef: React.RefObject<HTMLSelectElement | null>
  designSelectRef: React.RefObject<HTMLSelectElement | null>
  barcodeItemSelectRef: React.RefObject<HTMLSelectElement | null>
  barcodeTypeSelectRef: React.RefObject<HTMLSelectElement | null>
  labourChargesSelectRef: React.RefObject<HTMLSelectElement | null>
  salePurchaseSelectRef: React.RefObject<HTMLSelectElement | null>
  hsnInputRef: React.RefObject<HTMLInputElement | null>
  packWeightInputRef: React.RefObject<HTMLInputElement | null>
  tanchInputRef: React.RefObject<HTMLInputElement | null>
  wastageInputRef: React.RefObject<HTMLInputElement | null>
  labourRateInputRef: React.RefObject<HTMLInputElement | null>
  labourRateTypeSelectRef: React.RefObject<HTMLSelectElement | null>
  activeCheckboxRef: React.RefObject<HTMLInputElement | null>
}

function focusNextOnEnter(
  event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  nextElement?: HTMLElement | null
): void {
  if (event.key !== 'Enter') return
  event.preventDefault()
  nextElement?.focus()
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
  onNew,
  onMetalChange,
  itemNameInputRef,
  metalTypeSelectRef,
  itemGroupSelectRef,
  stampSelectRef,
  designSelectRef,
  barcodeItemSelectRef,
  barcodeTypeSelectRef,
  labourChargesSelectRef,
  salePurchaseSelectRef,
  hsnInputRef,
  packWeightInputRef,
  tanchInputRef,
  wastageInputRef,
  labourRateInputRef,
  labourRateTypeSelectRef,
  activeCheckboxRef
}: ItemFormProps): React.JSX.Element {
  return (
    <FormSection title={editingId ? 'Edit Item' : 'Add Item'}>
      <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2">
        Item Details
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Item Name"
          ref={itemNameInputRef}
          value={form.itemName}
          onChange={(e) => setForm((curr) => ({ ...curr, itemName: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, metalTypeSelectRef.current)}
          placeholder="Enter item name"
          required
        />

        <Select
          label="Metal Type"
          ref={metalTypeSelectRef}
          value={form.metalType}
          onChange={(e) => onMetalChange(e.target.value)}
          onKeyDown={(e) => focusNextOnEnter(e, itemGroupSelectRef.current)}
          options={[
            { label: 'GOLD', value: 'Gold' },
            { label: 'SILVER', value: 'Silver' }
          ]}
        />

        <Select
          label="Item Group"
          ref={itemGroupSelectRef}
          value={form.itemGroupId}
          onChange={(e) => setForm((curr) => ({ ...curr, itemGroupId: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, stampSelectRef.current)}
          options={[
            { label: 'Select Item Group', value: '' },
            ...activeGroups.map((g) => ({ label: g.groupName, value: g.id }))
          ]}
          required
        />

        <Select
          label="Default Stamp"
          ref={stampSelectRef}
          value={form.defaultStampId}
          onChange={(e) => setForm((curr) => ({ ...curr, defaultStampId: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, designSelectRef.current)}
          options={[
            { label: 'Select Stamp', value: '' },
            ...activeStamps.map((s) => ({ label: s.stampName, value: s.id }))
          ]}
        />

        <Select
          label="Default Design"
          ref={designSelectRef}
          value={form.defaultDesignId}
          onChange={(e) => setForm((curr) => ({ ...curr, defaultDesignId: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, barcodeItemSelectRef.current)}
          options={[
            { label: 'Select Design', value: '' },
            ...activeDesigns.map((d) => ({ label: d.designName, value: d.id }))
          ]}
        />

        <Select
          label="Barcode Item"
          ref={barcodeItemSelectRef}
          value={form.barcodeItem ? 'Yes' : 'No'}
          onChange={(e) =>
            setForm((curr) => ({
              ...curr,
              barcodeItem: e.target.value === 'Yes',
              barcodeType: e.target.value === 'Yes' ? curr.barcodeType : ''
            }))
          }
          onKeyDown={(e) => focusNextOnEnter(e, packWeightInputRef.current)}
          options={['Yes', 'No']}
        />
      </div>

      <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mt-4 mb-2">
        Sale Calculation Defaults
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Product / Pack Wt."
          ref={packWeightInputRef}
          type="text"
          inputMode="decimal"
          value={form.fixedWeightPerPcs}
          onChange={(e) => setForm((curr) => ({ ...curr, fixedWeightPerPcs: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, tanchInputRef.current)}
          placeholder="0"
        />

        <Input
          label="Default Tunch"
          ref={tanchInputRef}
          type="text"
          inputMode="decimal"
          value={form.defaultTanch}
          onChange={(e) => setForm((curr) => ({ ...curr, defaultTanch: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, wastageInputRef.current)}
          placeholder="0"
        />

        <Input
          label="Default Wastage"
          ref={wastageInputRef}
          type="text"
          inputMode="decimal"
          value={form.defaultWastage}
          onChange={(e) => setForm((curr) => ({ ...curr, defaultWastage: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, labourRateInputRef.current)}
          placeholder="0"
        />

        <Input
          label="Labour Rate"
          ref={labourRateInputRef}
          type="text"
          inputMode="decimal"
          value={form.defaultLabourRate}
          onChange={(e) => setForm((curr) => ({ ...curr, defaultLabourRate: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, labourRateTypeSelectRef.current)}
          placeholder="0"
        />

        <Select
          label="Labour Rate Type"
          ref={labourRateTypeSelectRef}
          value={form.labourRateType}
          onChange={(e) => setForm((curr) => ({ ...curr, labourRateType: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, barcodeTypeSelectRef.current)}
          options={[UNITS.KG, UNITS.GM, UNITS.PCS]}
        />

        <FormField label="Sale Formula Preview">
          <div className="p-2 text-xs bg-background-muted border border-border rounded-xs text-foreground-muted">
            L.Wt = Pack Wt x Pcs &middot; Hishob = Tunch + Wastage &middot; Fine = Net Wt x Hishob / 100
          </div>
        </FormField>
      </div>

      <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mt-4 mb-2">
        Billing Settings
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Select
          label="Barcode Type"
          ref={barcodeTypeSelectRef}
          value={form.barcodeType}
          disabled={!form.barcodeItem}
          onChange={(e) => setForm((curr) => ({ ...curr, barcodeType: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, labourChargesSelectRef.current)}
          options={[
            { label: 'No', value: '' },
            { label: 'CODE128', value: 'CODE128' },
            { label: 'QR', value: 'QR' },
            { label: 'EAN13', value: 'EAN13' }
          ]}
        />

        <Select
          label="Labour Charges By"
          ref={labourChargesSelectRef}
          value={form.labourChargesBy}
          onChange={(e) => setForm((curr) => ({ ...curr, labourChargesBy: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, salePurchaseSelectRef.current)}
          options={[UNITS.KG, UNITS.GM, UNITS.PCS]}
        />

        <Select
          label="Sale/Purchase By"
          ref={salePurchaseSelectRef}
          value={form.salePurchaseBy}
          onChange={(e) => setForm((curr) => ({ ...curr, salePurchaseBy: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, hsnInputRef.current)}
          options={['Fine', 'Weight', 'Pcs']}
        />

        <Input
          label="GST HSN Code"
          ref={hsnInputRef}
          value={form.gstHsnCode}
          onChange={(e) => setForm((curr) => ({ ...curr, gstHsnCode: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, activeCheckboxRef.current)}
          placeholder="Optional"
        />
      </div>

      <div className="mt-3">
        <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input
            type="checkbox"
            ref={activeCheckboxRef}
            checked={form.active}
            onChange={(e) => setForm((curr) => ({ ...curr, active: e.target.checked }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSave()
              }
            }}
          />
          <span>Active Item</span>
        </label>
      </div>

      <FormActions
        onSave={onSave}
        saveLabel={editingId ? 'Update' : 'Save'}
        loading={saving}
        customActions={
          <>
            <Button variant="secondary" onClick={onNew} disabled={saving}>
              New
            </Button>
            {editingId && (
              <Button variant="outline" onClick={onNew} disabled={saving}>
                Cancel Edit
              </Button>
            )}
          </>
        }
      />
    </FormSection>
  )
}
