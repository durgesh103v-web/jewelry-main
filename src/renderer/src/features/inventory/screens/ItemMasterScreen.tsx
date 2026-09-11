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

export function ItemMasterScreen({ onClose: _onClose }: ItemMasterScreenProps): React.JSX.Element {
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
