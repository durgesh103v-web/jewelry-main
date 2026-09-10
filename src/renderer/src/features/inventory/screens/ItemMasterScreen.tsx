import React from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { ConfirmDialog } from '@components/ui'
import { ItemForm } from '../components/ItemForm'
import { ItemFilters } from '../components/ItemFilters'
import { ItemTable } from '../components/ItemTable'
import { useItemMaster } from '../hooks/useItemMaster'

export interface ItemMasterScreenProps {
  onClose: () => void
}

export function ItemMasterScreen({ onClose }: ItemMasterScreenProps): React.JSX.Element {
  const {
    alert,
    clearAlert,
    form,
    setForm,
    items,
    editingId,
    selectedItemId,
    setSelectedItemId,
    selectedItem,
    deleteTarget,
    formOpen,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    metalTypeFilter,
    setMetalTypeFilter,
    itemGroupFilter,
    setItemGroupFilter,
    statusFilter,
    setStatusFilter,
    barcodeFilter,
    setBarcodeFilter,
    hasActiveFilters,
    handleClearFilters,
    itemGroups,
    activeGroups,
    activeStamps,
    activeDesigns,
    filteredItems,
    activeCount,
    openNewForm,
    openEditForm,
    closeForm,
    handleMetalChange,
    handleSave,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    handleExportCsv,
    itemNameRef
  } = useItemMaster()

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center shadow-inner shrink-0">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#b45309"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Item Master</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage jewellery products, metal purities, making charges, and billing defaults
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Alert Container */}
      {alert && (
        <div className="px-6 pt-4 shrink-0">
          <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />
        </div>
      )}

      {/* Toolbar & Filters */}
      <ItemFilters
        formOpen={formOpen}
        selectedItemName={selectedItem ? selectedItem.itemName : null}
        metalTypeFilter={metalTypeFilter}
        setMetalTypeFilter={setMetalTypeFilter}
        itemGroupFilter={itemGroupFilter}
        setItemGroupFilter={setItemGroupFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        barcodeFilter={barcodeFilter}
        setBarcodeFilter={setBarcodeFilter}
        itemGroups={itemGroups}
        searchText={searchText}
        setSearchText={setSearchText}
        totalCount={items.length}
        activeCount={activeCount}
        showingCount={filteredItems.length}
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
            <ItemForm
              form={form}
              setForm={setForm}
              activeGroups={activeGroups}
              activeStamps={activeStamps}
              activeDesigns={activeDesigns}
              editingId={editingId}
              saving={saving}
              onSave={() => void handleSave()}
              onCancel={closeForm}
              onMetalChange={handleMetalChange}
              itemNameRef={itemNameRef}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 rounded-xl bg-white shadow-sm">
            <ItemTable
              items={filteredItems}
              loading={loading}
              searchText={searchText}
              selectedId={selectedItemId}
              onSelect={(id) => setSelectedItemId(id)}
              onDoubleClick={(item) => openEditForm(item)}
              onEdit={(item) => openEditForm(item)}
              onDelete={(item) => requestDelete(item)}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Item?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.itemName}"? This action cannot be undone.`
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

export default ItemMasterScreen
