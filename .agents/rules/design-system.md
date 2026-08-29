# AI Coding Rules — Jewellery ERP Design System & Architecture

1. **Feature-Based Module Organization**:
   - Feature-specific UI, components, screens, and hooks belong inside `src/renderer/src/features/<feature>/`.
   - Screen components should primarily compose UI components (`AccountForm`, `AccountFilters`, `AccountTable`) and feature hooks (`useAccountMaster`).

2. **Accounting & Layer Boundaries**:
   - Account UI and hooks must not contain accounting calculations or debit/credit postings.
   - Account components must not access SQLite or call `ipcRenderer` directly; use `window.api`.
   - Account business rules remain in existing services (`account.service.ts`).

3. **App.tsx is the Composition Root**:
   - `App.tsx` must remain a small composition root. Navigation configuration belongs in `src/renderer/src/app/navigation/menu.config.ts`, and screen mapping belongs in `src/renderer/src/app/navigation/screenRegistry.ts`.

4. **Preserve Desktop Workspace Tab Model**:
   - Do not introduce React Router or browser routing libraries.
   - Maintain tab opening, closing, and active switching via `AppWorkspace.tsx`.

5. **Reuse Existing Custom Hooks (`@renderer/hooks`)**:
   - Always check `@renderer/hooks` before creating custom `useState` or `useEffect` routines for async data, alert timers, form values, table state, or confirm modals.
   - Use `useAsync`, `useAlert`, `useConfirmModal`, `useFormState`, `useDataTable`, `useDisclosure`, `useJewelleryMath`, `useBarcodeScanner`, `useWeightScale`.

6. **Reuse Existing UI Components (`@components/ui`)**:
   - Always check `@components/ui` before building custom inputs, buttons, tables, dialogs, badges, or search controls.
   - Do not create duplicate `<button>`, `<input>`, `<select>`, `<table>`, or modal wrappers in screen components.

7. **Design Tokens First**:
   - Always use semantic CSS variables (`var(--color-brand-primary)`, `var(--color-background-app)`) or matching Tailwind utility classes (`bg-brand-primary`, `bg-background-app`, `text-foreground`).
   - Never hardcode raw hex colors (`#1a73e8`, `#059669`, `#dc2626`) in inline styles or component CSS.

8. **Centralized Business Constants & Formatters**:
   - Always import domain constants from `@shared/constants`.
   - Always import formatting functions (`formatDate`, `formatNumber`, `toNumber`, `formatCurrency`, `formatWeight`) from `@utils/formatters`.

9. **No Breaking Changes & Scope Control**:
   - Do not modify dependent business modules (`SaleScreen`, `PurchaseScreen`, etc.) during Account Master migration.
   - Never rewrite working business logic or database queries during UI refactoring.
   - Maintain full backwards compatibility for Electron IPC bindings and SQLite data models.
