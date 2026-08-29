# Accounts Feature — Account Master Module

> **Feature Directory**: `src/renderer/src/features/accounts/`  

---

## Component Architecture

The Account Master module is organized into a clean feature-based architecture:

```
src/renderer/src/features/accounts/
  screens/
    AccountMasterScreen.tsx      ← Screen composition root
  components/
    AccountForm.tsx              ← Basic details, opening balance, contact, & tax form
    AccountFilters.tsx           ← Top action toolbar, type filter, & live search bar
    AccountTable.tsx             ← Presentational data table grid with status Badges
  hooks/
    useAccountMaster.ts          ← Account list/group state, form toggle, validation, shortcuts
  index.ts                       ← Public feature barrel export
```

---

## Data & Accounting Layer Boundaries

```
    AccountMasterScreen / AccountForm / AccountTable
                          ↓
                `useAccountMaster` Hook
                          ↓
                `window.api.accounts` (Preload)
                          ↓
                `account.service.ts` (Electron Main)
                          ↓
                   SQLite Database
```

- **Accounting Safeguards**: Opening balances, credit limits, debit/credit semantics, and ledger posting remain in `account.service.ts`.
- **Database / IPC Isolation**: UI components and hooks never import `better-sqlite3` or call `ipcRenderer` directly.
- **Reusable UI Components**: Leverages Phase 2 UI primitives (`Input`, `Select`, `Textarea`, `Button`, `DataTable`, `Badge`, `ConfirmDialog`).
