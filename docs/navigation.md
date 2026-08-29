# Application Shell & Navigation Architecture

> **Source Directory**: `src/renderer/src/app/`  

---

## Architecture Overview

The Jewellery ERP application shell separates bootstrapping, desktop layout, screen registry, and tab management:

```
src/renderer/src/
  App.tsx                      ← Composition Root (~15 lines)
  app/
    providers/
      AppProviders.tsx         ← Global context provider wrapper
    shell/
      AppShell.tsx             ← Layout container & toast alerts
      AppHeader.tsx            ← Menu dropdowns, firm info, user status
      AppWorkspace.tsx         ← Main content container & tab strip
      ScreenRenderer.tsx       ← Suspense-wrapped screen loader
      DashboardScreen.tsx      ← KPI metrics & quick action grid
    navigation/
      navigation.types.ts      ← ScreenDefinition, MenuItem, WorkspaceTab types
      menu.config.ts           ← Business-type visibility filtering
      screenRegistry.ts        ← Screen ID to component mapping (with React.lazy)
```

---

## Key Principles

1. **Tab-Based Workspace Preserved**: The desktop workspace tab model (`tabs`, `activeTabId`, tab switching, tab closing) is preserved without introducing React Router.
2. **Business Type Menu Visibility**: Wholesale-only modules (`sale`, `purchase`, `job-work`, `cash-fine-opening`, `sauda-book`, etc.) are filtered dynamically via `getMenusForBusinessType(type)` and gated via `visibleScreenIds`.
3. **Lazy Loading**: Heavy screens (`SaleScreen`, `PurchaseScreen`, `AccountMasterScreen`, `JobWorkScreen`, `RepairEntryScreen`, reports) are loaded on-demand via `React.lazy()` with `<Suspense fallback={<LoadingState />}>`.
4. **No Direct IPC or SQLite in Shell**: Shell components delegate all data fetching to services and preload `window.api`.
