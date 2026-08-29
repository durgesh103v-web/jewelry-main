# AI Coding Rules — Jewellery ERP Design System & Architecture

1. **App.tsx is the Composition Root**:
   - `App.tsx` must remain a small composition root. Do not add screen rendering ladders, inline menu arrays, or heavy state into `App.tsx`.
   - Navigation configuration belongs in `src/renderer/src/app/navigation/menu.config.ts`.
   - Screen mapping belongs in `src/renderer/src/app/navigation/screenRegistry.ts`.

2. **Preserve Desktop Workspace Tab Model**:
   - Do not introduce React Router or browser routing libraries.
   - Maintain tab opening, closing, and active switching via `AppWorkspace.tsx`.

3. **Reuse Existing Custom Hooks (`@renderer/hooks`)**:
   - Always check `@renderer/hooks` before creating custom `useState` or `useEffect` routines for async data, alert timers, form values, table state, or confirm modals.
   - Use `useAsync`, `useAlert`, `useConfirmModal`, `useFormState`, `useDataTable`, `useDisclosure`, `useJewelleryMath`, `useBarcodeScanner`, `useWeightScale`.

4. **Reuse Existing UI Components (`@components/ui`)**:
   - Always check `@components/ui` before building custom inputs, buttons, tables, dialogs, badges, or search controls.
   - Do not create duplicate `<button>`, `<input>`, `<select>`, `<table>`, or modal wrappers in screen components.

5. **Strict Layer Boundaries**:
   - Navigation and shell components must not contain business logic or access database/services directly.
   - UI components and hooks must not call `ipcRenderer` directly; always use `window.api`.

6. **Design Tokens First**:
   - Always use semantic CSS variables (`var(--color-brand-primary)`, `var(--color-background-app)`) or matching Tailwind utility classes (`bg-brand-primary`, `bg-background-app`, `text-foreground`).
   - Never hardcode raw hex colors (`#1a73e8`, `#059669`, `#dc2626`) in inline styles or component CSS.

7. **Centralized Business Constants & Formatters**:
   - Always import domain constants from `@shared/constants`.
   - Always import formatting functions (`formatDate`, `formatNumber`, `toNumber`, `formatCurrency`, `formatWeight`) from `@utils/formatters`.

8. **No Breaking Changes**:
   - Never rewrite working business logic or database queries during UI refactoring.
   - Maintain full backwards compatibility for Electron IPC bindings and SQLite data models.
