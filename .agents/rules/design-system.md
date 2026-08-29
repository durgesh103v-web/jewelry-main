# AI Coding Rules — Jewellery ERP Design System & Architecture

1. **Reuse Existing UI Components (`@components/ui`)**:
   - Always check `@components/ui` before building custom inputs, buttons, tables, dialogs, badges, or search controls.
   - Do not create duplicate `<button>`, `<input>`, `<select>`, `<table>`, or modal wrappers in screen components.

2. **Design Tokens First**:
   - Always use semantic CSS variables (`var(--color-brand-primary)`, `var(--color-background-app)`) or matching Tailwind utility classes (`bg-brand-primary`, `bg-background-app`, `text-foreground`).
   - Never hardcode raw hex colors (`#1a73e8`, `#059669`, `#dc2626`) in inline styles or component CSS.

3. **Presentational Component Purity**:
   - Keep `@components/ui` components strictly presentational.
   - Never put business math, IPC invocations (`window.api`), or database logic inside UI primitives.

4. **Centralized Business Constants**:
   - Always import domain constants from `@constants` or `@shared/constants`.
   - Never hardcode metal strings (`"Gold"`), units (`"Gm"`), or payment methods (`"Cash"`) directly in components.

5. **Centralized Formatters**:
   - Always import formatting functions (`formatDate`, `formatNumber`, `toNumber`, `formatCurrency`, `formatWeight`) from `@utils/formatters`.
   - Never re-create local `formatDate` or `formatNumber` functions inside screen components.

6. **Styling Split**:
   - Use Tailwind for layouts, flex/grid structures, spacing, simple text, and standard borders.
   - Use normal CSS for complex print preview templates, multi-nested tables, or legacy component styles.

7. **No Breaking Changes**:
   - Never rewrite working business logic or database queries during UI refactoring.
   - Maintain full backwards compatibility for Electron IPC bindings and SQLite data models.
