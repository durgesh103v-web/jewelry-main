import React from 'react'
import { Input, Select, Textarea, Button, FormSection, FormActions } from '@components/ui'

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

  return (
    <div className="bg-background border border-border rounded-sm p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {editingId ? 'Edit Account' : 'Add New Account'}
          </h3>
          <p className="text-xs text-foreground-muted">
            Enter account details, opening balance, limits, and contact information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={onSave} loading={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Account' : 'Save Account'}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>

      <FormSection title="Basic Details">
        <div className="grid grid-cols-4 gap-3">
          <Input
            label="Name"
            ref={accountNameRef}
            value={form.accountName}
            onChange={(e) => updateForm('accountName', e.target.value)}
            placeholder="Enter account name"
            required
          />

          <Input
            label="Other Name"
            value={form.otherName}
            onChange={(e) => updateForm('otherName', e.target.value)}
            placeholder="Optional"
          />

          <Select
            label="Account Type"
            value={form.accountType}
            onChange={(e) => updateForm('accountType', e.target.value)}
            options={ACCOUNT_TYPES}
          />

          <Select
            label="Account Group"
            value={form.accountGroupId}
            onChange={(e) => updateForm('accountGroupId', e.target.value)}
            options={[
              { label: 'Select Group', value: '' },
              ...activeGroups.map((g) => ({
                label: `${g.groupName} - ${g.groupType}`,
                value: g.id
              }))
            ]}
            required
          />
        </div>
      </FormSection>

      <FormSection title="Opening Balance">
        <div className="grid grid-cols-4 gap-3">
          <Input
            label="Gold Fine"
            value={form.openingGoldFine}
            inputMode="decimal"
            onChange={(e) => updateAmountField('openingGoldFine', e.target.value)}
            placeholder="0 or -8000"
          />

          <Input
            label="Silver Fine"
            value={form.openingSilverFine}
            inputMode="decimal"
            onChange={(e) => updateAmountField('openingSilverFine', e.target.value)}
            placeholder="0 or -8000"
          />

          <Input
            label="Cash"
            value={form.openingCash}
            inputMode="decimal"
            onChange={(e) => updateAmountField('openingCash', e.target.value)}
            placeholder="0 or -8000"
          />

          <Input
            label="Anamat"
            value={form.openingAnamat}
            inputMode="decimal"
            onChange={(e) => updateAmountField('openingAnamat', e.target.value)}
            placeholder="0"
          />

          <Input
            label="Bank"
            value={form.openingBank}
            inputMode="decimal"
            onChange={(e) => updateAmountField('openingBank', e.target.value)}
            placeholder="0"
          />

          <Input
            label="Last Date"
            type="date"
            value={form.lastDate}
            onChange={(e) => updateForm('lastDate', e.target.value)}
          />

          <Input
            label="Gold Fine Limit"
            value={form.goldFineLimit}
            inputMode="decimal"
            onChange={(e) => updateAmountField('goldFineLimit', e.target.value)}
            placeholder="0"
          />

          <Input
            label="Silver Fine Limit"
            value={form.silverFineLimit}
            inputMode="decimal"
            onChange={(e) => updateAmountField('silverFineLimit', e.target.value)}
            placeholder="0"
          />
        </div>
      </FormSection>

      <FormSection title="Contact Details">
        <div className="grid grid-cols-4 gap-3">
          <Input
            label="WhatsApp Number"
            value={form.whatsappNumber}
            onChange={(e) => updateForm('whatsappNumber', e.target.value)}
          />

          <Input
            label="Phone 2"
            value={form.phone2}
            onChange={(e) => updateForm('phone2', e.target.value)}
          />

          <div className="col-span-2">
            <Textarea
              label="Address"
              rows={2}
              value={form.address}
              onChange={(e) => updateForm('address', e.target.value)}
              placeholder="Full address"
            />
          </div>

          <Input
            label="City"
            value={form.city}
            onChange={(e) => updateForm('city', e.target.value)}
          />

          <Input
            label="State"
            value={form.state}
            onChange={(e) => updateForm('state', e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="Tax / Other Details">
        <div className="grid grid-cols-4 gap-3">
          <Input
            label="GST No."
            value={form.gstNo}
            onChange={(e) => updateForm('gstNo', e.target.value.toUpperCase())}
          />

          <Input
            label="PAN No."
            value={form.panNo}
            onChange={(e) => updateForm('panNo', e.target.value.toUpperCase())}
          />

          <Input
            label="Notification"
            value={form.notification}
            onChange={(e) => updateForm('notification', e.target.value)}
            placeholder="Reminder or note"
          />

          <Select
            label="Active"
            value={form.active ? 'Yes' : 'No'}
            onChange={(e) => updateForm('active', e.target.value === 'Yes')}
            options={['Yes', 'No']}
          />
        </div>
      </FormSection>

      <FormActions
        onSave={onSave}
        saveLabel={editingId ? 'Update Account' : 'Save Account'}
        loading={saving}
        onCancel={onCancel}
      />
    </div>
  )
}
