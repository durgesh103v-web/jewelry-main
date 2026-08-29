# Custom React Hooks Documentation

> **Package**: `@renderer/hooks`  
> **Source Directory**: `src/renderer/src/hooks/`  

---

## Architecture Boundaries

React hooks in the Jewellery ERP application strictly follow these layer boundaries:

```
    React Component / Screen
              ↓
    React Custom Hook (UI State / UI Interactions)
              ↓
    Preload Bridge (`window.api`)
              ↓
    Electron Main Service (Business Logic / Better-SQLite3 Queries)
```

- **Hooks DO NOT contain SQLite queries** or import `better-sqlite3`.
- **Hooks DO NOT import `ipcRenderer` directly**.
- **Hooks DO NOT re-implement jewellery math or GST formulas**. Pure domain formulas stay in `@shared/jewelleryFormula`.
- **Hooks manage UI State**: async execution status, form values, table sorting/filtering, modals, and device event listeners.

---

## Custom Hooks Catalog

### 1. `useAsync<T, Args>` (`@renderer/hooks`)
- **Purpose**: Wraps an asynchronous Promise function to manage `data`, `loading`, and `error` states automatically.
- **Example**:
  ```tsx
  const { data: accounts, loading, execute: fetchAccounts } = useAsync(window.api.accounts.list)
  ```

### 2. `useAlert` (`@renderer/hooks`)
- **Purpose**: Manages temporary alert/toast notification timer state with automatic timeout cleanup.
- **Example**:
  ```tsx
  const { alert, showAlert, clearAlert } = useAlert()
  showAlert('success', 'Account created successfully.')
  ```

### 3. `useConfirmModal<T>` (`@renderer/hooks`)
- **Purpose**: Manages target item state and loading state for confirmation dialogs.
- **Example**:
  ```tsx
  const { target, requestConfirm, handleConfirm, handleCancel } = useConfirmModal<AccountRecord>()
  requestConfirm(selectedAccount)
  ```

### 4. `useFormState<T>` (`@renderer/hooks`)
- **Purpose**: Lightweight form state manager supporting `values`, `setValue`, `setValues`, `resetForm`, `handleChange`, and `isSubmitting`.
- **Example**:
  ```tsx
  const { values, setValue, handleChange, resetForm } = useFormState({ name: '', active: true })
  ```

### 5. `useDataTable<T>` (`@renderer/hooks`)
- **Purpose**: Presentational table UI state manager for pagination, sorting, search keyword filtering, and row selection.
- **Example**:
  ```tsx
  const { searchText, setSearchText, filterData } = useDataTable<AccountRecord>()
  ```

### 6. `useDisclosure` (`@renderer/hooks`)
- **Purpose**: Boolean toggle state for drawers, popovers, and modals.
- **Example**:
  ```tsx
  const { isOpen, open, close, toggle } = useDisclosure()
  ```

### 7. `useDebounce<T>` (`@renderer/hooks`)
- **Purpose**: Debounces fast-changing values (e.g. search inputs).

### 8. `useJewelleryMath` (`@renderer/hooks`)
- **Purpose**: React wrapper providing pure jewellery calculation functions re-exported from `@shared/jewelleryFormula`.

### 9. `useBarcodeScanner` (`@renderer/hooks`)
- **Purpose**: Hardware barcode scanner keydown buffer listener.

### 10. `useWeightScale` (`@renderer/hooks`)
- **Purpose**: Weighing scale device reading status via `window.api.weightScan`.
