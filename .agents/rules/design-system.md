# AI Coding Rules — Jewellery ERP Design System & Architecture

1. **Reuse Existing Custom Hooks (`@renderer/hooks`)**:
   - Always check `@renderer/hooks` before creating custom `useState` or `useEffect` routines for async data, alert timers, form values, table state, or confirm modals.
   - Use `useAsync`, `useAlert`, `useConfirmModal`, `useFormState`, `useDataTable`, `useDisclosure`, `useJewelleryMath`, `useBarcodeScanner`, `useWeightScale`.

2. **Reuse Existing UI Components (`@components/ui`)**:
   - Always check `@components/ui` before building custom inputs, buttons, tables, dialogs, badges, or search controls.
   - Do not create duplicate `<button>`, `<input>`, `<select>`, `<table>`, or modal wrappers in screen components.

3. **Strict Layer Boundaries**:
   - React hooks MUST remain purely UI-state focused.
   - Never import `better-sqlite3`, database connection files, or Electron main-process modules inside React hooks.
   - Never call `ipcRenderer` directly inside React hooks; always use `window.api`.

4. **Design Tokens First**:
   - Always use semantic CSS variables (`var(--color-brand-primary)`, `var(--color-background-app)`) or matching Tailwind utility classes (`bg-brand-primary`, `bg-background-app`, `text-foreground`).
   - Never hardcode raw hex colors (`#1a73e8`, `#059669`, `#dc2626`) in inline styles or component CSS.

5. **Centralized Business Constants**:
   - Always import domain constants from `@constants` or `@shared/constants`.
   - Never hardcode metal strings (`"Gold"`), units (`"Gm"`), or payment methods (`"Cash"`) directly in components.

6. **Centralized Formatters**:
   - Always import formatting functions (`formatDate`, `formatNumber`, `toNumber`, `formatCurrency`, `formatWeight`) from `@utils/formatters`.
   - Never re-create local `formatDate` or `formatNumber` functions inside screen components.

7. **No Breaking Changes**:
   - Never rewrite working business logic or database queries during UI refactoring.
   - Maintain full backwards compatibility for Electron IPC bindings and SQLite data models.
