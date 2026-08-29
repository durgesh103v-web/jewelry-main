# Inventory Feature — Item Master Module

> **Feature Directory**: `src/renderer/src/features/inventory/`  

---

## Component Architecture

The Item Master module is organized into a clean feature-based architecture:

```
src/renderer/src/features/inventory/
  screens/
    ItemMasterScreen.tsx       ← Screen composition root
  components/
    ItemForm.tsx               ← Item details, sale defaults, & billing settings form
    ItemFilters.tsx            ← Live search bar & record counter summary
    ItemTable.tsx              ← DataTable grid with 16 columns & status badges
  hooks/
    useItemMaster.ts           ← Form state, IPC queries, validation, shortcuts
  index.ts                     ← Public feature barrel export
```

---

## Data & Layer Boundaries

```
    ItemMasterScreen / ItemForm / ItemTable
                      ↓
              `useItemMaster` Hook
                      ↓
             `window.api.items` (Preload)
                      ↓
              `item.service.ts` (Electron Main)
                      ↓
               SQLite Database
```

- **Database / IPC Isolation**: Components and hooks never call `ipcRenderer` directly or access SQLite.
- **Shared Domain Constants**: Uses `METAL_OPTIONS`, `METAL_TYPES`, and `UNITS` from `@shared/constants`.
- **Reusable UI Components**: Leverages Phase 2 UI primitives (`Input`, `Select`, `Button`, `DataTable`, `Badge`, `ConfirmDialog`, `MetalSelect`, `WeightInput`).
