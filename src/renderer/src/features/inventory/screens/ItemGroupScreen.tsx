import React from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { ConfirmDialog } from '@components/ui'
import { ItemGroupForm } from '../components/ItemGroupForm'
import { ItemGroupFilters } from '../components/ItemGroupFilters'
import { ItemGroupTable } from '../components/ItemGroupTable'
import { useItemGroupMaster } from '../hooks/useItemGroupMaster'

export interface ItemGroupScreenProps {
  onClose?: () => void
}

export function ItemGroupScreen({ onClose: _onClose }: ItemGroupScreenProps): React.JSX.Element {
  const {
    alert,
    clearAlert,
    form,
    setForm,
    itemGroups,
    editingId,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroup,
    deleteTarget,
    formOpen,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    metalTypeFilter,
    setMetalTypeFilter,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    handleClearFilters,
    filteredGroups,
    activeCount,
    openNewForm,
    openEditForm,
    closeForm,
    handleSave,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    handleExportCsv,
    groupNameRef
  } = useItemGroupMaster()

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#eef2f6)]">
      {/* Alert Container */}
      {alert && (
        <div className="px-6 pt-4 shrink-0">
          <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />
        </div>
      )}

      {/* Toolbar & Filters */}
      <ItemGroupFilters
        formOpen={formOpen}
        selectedGroupName={selectedGroup ? selectedGroup.groupName : null}
        metalTypeFilter={metalTypeFilter}
        setMetalTypeFilter={setMetalTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchText={searchText}
        setSearchText={setSearchText}
        totalCount={itemGroups.length}
        activeCount={activeCount}
        showingCount={filteredGroups.length}
        onAddNew={openNewForm}
        onPrint={handlePrint}
        onExportCsv={handleExportCsv}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Body Area */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-5 pt-2 gap-4 min-h-0">
        {formOpen ? (
          <div className="flex-1 overflow-hidden flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm">
            <ItemGroupForm
              form={form}
              setForm={setForm}
              editingId={editingId}
              saving={saving}
              onSave={handleSave}
              onCancel={closeForm}
              groupNameRef={groupNameRef}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 rounded-xl bg-white shadow-sm">
              <ItemGroupTable
                groups={filteredGroups}
                loading={loading}
                searchText={searchText}
                selectedId={selectedGroupId}
                onSelect={(id) => setSelectedGroupId(id)}
                onDoubleClick={(group) => openEditForm(group)}
                onEdit={(group) => openEditForm(group)}
                onDelete={(group) => requestDelete(group)}
              />
            </div>

            {/* Helper bottom bar */}
            <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 select-none shrink-0 no-print font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-amber-500 shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Click row to select · Double-click to edit group</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Total Groups: {itemGroups.length}</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-semibold">Active: {activeCount}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
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
