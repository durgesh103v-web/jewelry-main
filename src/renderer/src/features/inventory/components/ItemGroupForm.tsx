import React from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Input, Select, Button, FormSection, FormActions } from '@components/ui'

export interface ItemGroupFormValues {
  groupName: string
  metalType: string
  description: string
  active: boolean
}

export interface ItemGroupFormProps {
  form: ItemGroupFormValues
  setForm: React.Dispatch<React.SetStateAction<ItemGroupFormValues>>
  editingId: string | null
  saving: boolean
  onSave: () => void
  onNew: () => void
  groupNameInputRef: React.RefObject<HTMLInputElement | null>
  metalTypeSelectRef: React.RefObject<HTMLSelectElement | null>
  descriptionInputRef: React.RefObject<HTMLInputElement | null>
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

export function ItemGroupForm({
  form,
  setForm,
  editingId,
  saving,
  onSave,
  onNew,
  groupNameInputRef,
  metalTypeSelectRef,
  descriptionInputRef,
  activeCheckboxRef
}: ItemGroupFormProps): React.JSX.Element {
  return (
    <FormSection title={editingId ? 'Edit Item Group' : 'Add Item Group'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Group Name"
          ref={groupNameInputRef}
          value={form.groupName}
          onChange={(e) => setForm((curr) => ({ ...curr, groupName: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, metalTypeSelectRef.current)}
          placeholder="Enter item group name"
          required
        />

        <Select
          label="Metal Type"
          ref={metalTypeSelectRef}
          value={form.metalType}
          onChange={(e) => setForm((curr) => ({ ...curr, metalType: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, descriptionInputRef.current)}
          options={['Gold', 'Silver', 'Diamond', 'Other']}
        />

        <Input
          label="Description"
          ref={descriptionInputRef}
          value={form.description}
          onChange={(e) => setForm((curr) => ({ ...curr, description: e.target.value }))}
          onKeyDown={(e) => focusNextOnEnter(e, activeCheckboxRef.current)}
          placeholder="Optional description"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none text-foreground">
          <input
            type="checkbox"
            ref={activeCheckboxRef}
            checked={form.active}
            onChange={(e) => setForm((curr) => ({ ...curr, active: e.target.checked }))}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSave()
              }
            }}
          />
          <span>Active Group</span>
        </label>

        <FormActions
          onSave={onSave}
          saveLabel={editingId ? 'Update Group' : 'Save Group'}
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
      </div>
    </FormSection>
  )
}
