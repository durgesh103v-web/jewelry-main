# AI Coding Rules — Jewellery ERP Design System & Architecture

1. **Design Tokens First**:
   - Always use semantic CSS variables (`var(--color-brand-primary)`, `var(--color-background-app)`) or matching Tailwind utility classes (`bg-brand-primary`, `bg-background-app`, `text-foreground`).
   - Never hardcode raw hex colors (`#1a73e8`, `#059669`, `#dc2626`) in inline styles or component CSS.

2. **Centralized Business Constants**:
   - Always import domain constants from `@constants` or `@shared/constants`.
   - Never hardcode metal strings (`"Gold"`), units (`"Gm"`), or payment methods (`"Cash"`) directly in components.

3. **Centralized Formatters**:
   - Always import formatting functions (`formatDate`, `formatNumber`, `toNumber`, `formatCurrency`, `formatWeight`) from `@utils/formatters`.
   - Never re-create local `formatDate` or `formatNumber` functions inside screen components.

4. **Styling Split**:
   - Use Tailwind for layouts, flex/grid structures, spacing, simple text, and standard borders.
   - Use normal CSS for complex print preview templates, multi-nested tables, or legacy component styles.

5. **No Breaking Changes**:
   - Never rewrite working business logic or database queries during UI refactoring.
   - Maintain full backwards compatibility for Electron IPC bindings and SQLite data models.
