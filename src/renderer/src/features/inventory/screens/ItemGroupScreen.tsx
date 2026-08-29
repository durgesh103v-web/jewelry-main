import React from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { PageHeader, ConfirmDialog } from '@components/ui'
import { ItemGroupForm } from '../components/ItemGroupForm'
import { ItemGroupFilters } from '../components/ItemGroupFilters'
import { ItemGroupTable } from '../components/ItemGroupTable'
import { useItemGroupMaster } from '../hooks/useItemGroupMaster'

export interface ItemGroupScreenProps {
  onClose: () => void
}

export function ItemGroupScreen({ onClose }: ItemGroupScreenProps): React.JSX.Element {
  const {
    alert,
    clearAlert,
    form,
    setForm,
    itemGroups,
    editingId,
    deleteTarget,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    filteredGroups,
    activeCount,
    handleNew,
    handleSave,
    handleEdit,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    groupNameInputRef,
    metalTypeSelectRef,
    descriptionInputRef,
    activeCheckboxRef
  } = useItemGroupMaster()

  return (
    <div className="h-full flex flex-col bg-background p-5 overflow-auto space-y-4">
      <PageHeader
        title="Item Group Master"
        description="Configure jewellery metal groups, categories, and item classifications."
        actions={
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-border text-foreground-muted hover:text-foreground hover:bg-background-muted flex items-center justify-center transition-colors text-lg"
            onClick={onClose}
            title="Close"
          >
            &times;
          </button>
        }
      />

      {alert && <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />}

      <ItemGroupForm
        form={form}
        setForm={setForm}
        editingId={editingId}
        saving={saving}
        onSave={() => void handleSave()}
        onNew={handleNew}
        groupNameInputRef={groupNameInputRef}
        metalTypeSelectRef={metalTypeSelectRef}
        descriptionInputRef={descriptionInputRef}
        activeCheckboxRef={activeCheckboxRef}
      />

      <div className="bg-background-panel border border-border rounded-lg p-3 space-y-3 shadow-xs">
        <ItemGroupFilters
          searchText={searchText}
          setSearchText={setSearchText}
          totalCount={itemGroups.length}
          activeCount={activeCount}
          showingCount={filteredGroups.length}
        />

        <ItemGroupTable
          groups={filteredGroups}
          loading={loading}
          searchText={searchText}
          onEdit={handleEdit}
          onDelete={requestDelete}
        />
      </div>

      <div className="text-xs text-foreground-muted bg-background-muted/60 p-2.5 rounded border border-border/50">
        Tip: Click or double-click a row to edit. Press Enter to move through the form fields.
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Item Group?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.groupName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default ItemGroupScreen
