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
    deleteTarget,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    activeGroups,
    activeStamps,
    activeDesigns,
    filteredItems,
    activeCount,
    handleNew,
    handleMetalChange,
    handleSave,
    handleEdit,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
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
  } = useItemMaster()

  return (
    <div className="item-master-screen">
      <div className="item-master-window">
        <div className="form-title-bar">
          <span>Item Master</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-master-body">
          {alert && <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />}

          <ItemForm
            form={form}
            setForm={setForm}
            activeGroups={activeGroups}
            activeStamps={activeStamps}
            activeDesigns={activeDesigns}
            editingId={editingId}
            saving={saving}
            onSave={() => void handleSave()}
            onNew={handleNew}
            onMetalChange={handleMetalChange}
            itemNameInputRef={itemNameInputRef}
            metalTypeSelectRef={metalTypeSelectRef}
            itemGroupSelectRef={itemGroupSelectRef}
            stampSelectRef={stampSelectRef}
            designSelectRef={designSelectRef}
            barcodeItemSelectRef={barcodeItemSelectRef}
            barcodeTypeSelectRef={barcodeTypeSelectRef}
            labourChargesSelectRef={labourChargesSelectRef}
            salePurchaseSelectRef={salePurchaseSelectRef}
            hsnInputRef={hsnInputRef}
            packWeightInputRef={packWeightInputRef}
            tanchInputRef={tanchInputRef}
            wastageInputRef={wastageInputRef}
            labourRateInputRef={labourRateInputRef}
            labourRateTypeSelectRef={labourRateTypeSelectRef}
            activeCheckboxRef={activeCheckboxRef}
          />

          <ItemFilters
            searchText={searchText}
            setSearchText={setSearchText}
            totalCount={items.length}
            activeCount={activeCount}
            showingCount={filteredItems.length}
          />

          <ItemTable
            items={filteredItems}
            loading={loading}
            searchText={searchText}
            onEdit={handleEdit}
            onDelete={requestDelete}
          />

          <div className="screen-help-text mt-3">
            Sale logic: Less Weight = Product / Pack Weight x Pcs. Net Weight = Gross Weight - Less
            Weight. Hishob = Tunch + Wastage. Fine = Net Weight x Hishob / 100.
          </div>
        </div>
      </div>

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
