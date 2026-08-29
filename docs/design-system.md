# Jewellery ERP Design System Architecture & Guidelines

> **Version**: 1.0.0 (Phase 1 Foundation)  
> **Target Stack**: Electron + React 19 + TypeScript + Tailwind CSS v3 + Custom CSS Variables  

---

## Architecture Principles

The Jewellery ERP Design System enforces a strict single-source-of-truth hierarchy:

```
 DESIGN TOKENS (tokens.css)
        ↓
   CSS VARIABLES
        ↓
 ┌───────────────┐
 │               │
Tailwind       Normal CSS
 │               │
 └───────┬───────┘
         ↓
Reusable UI Components (Phase 2)
         ↓
  Feature Screens
```

- **CSS Variables (`src/renderer/src/styles/tokens.css`)** are the single source of truth.
- **Tailwind CSS (`tailwind.config.js`)** maps utilities directly to CSS variables (`bg-brand-primary`, `bg-background-card`, `text-foreground`, `border-border`).
- **Normal CSS** accesses the exact same CSS variables via `var(--token-name)`.
- **Zero Duplication**: Never define brand colors, fonts, spacing, or radii independently in Tailwind and CSS.

---

## Token Reference

### 1. Colors

| Category | CSS Variable | Semantic Meaning / Usage | Tailwind Equivalent |
| :--- | :--- | :--- | :--- |
| **Brand** | `--color-brand-primary` | Primary action buttons, active states (`#1a73e8`) | `bg-brand-primary` / `text-brand-primary` |
| | `--color-brand-primary-hover` | Primary hover state (`#1557b0`) | `bg-brand-primary-hover` |
| | `--color-brand-soft` | Soft brand container background (`#e8f0fe`) | `bg-brand-soft` |
| **Background** | `--color-background-app` | Main window app canvas (`#eef1f5`) | `bg-background-app` |
| | `--color-background-surface` | Panels, header bar, card background (`#ffffff`) | `bg-background-surface` |
| | `--color-background-muted` | Table headers, secondary containers (`#f4f6f9`) | `bg-background-muted` |
| **Text** | `--color-text-primary` | Main readable text (`#1f2430`) | `text-foreground` |
| | `--color-text-secondary` | Secondary metadata labels (`#4b5563`) | `text-foreground-secondary` |
| | `--color-text-muted` | Muted placeholders / captions (`#6b7280`) | `text-foreground-muted` |
| **Border** | `--color-border-default` | Card borders, dividers (`#e2e5eb`) | `border-border` |
| | `--color-border-strong` | Input borders, active outlines (`#d6dbe3`) | `border-border-strong` |
| **Status** | `--color-success` | Success badges, positive cash (`#059669`) | `text-success` / `bg-success` |
| | `--color-warning` | Overdue reminders, warning states (`#b45309`) | `text-warning` / `bg-warning` |
| | `--color-error` | Error alerts, delete buttons (`#dc2626`) | `text-error` / `bg-error` |
| **Jewellery** | `--color-gold` | Gold fine weight tags (`#d97706`) | `text-jewellery-gold` |
| | `--color-silver` | Silver fine weight tags (`#64748b`) | `text-jewellery-silver` |

---

### 2. Spacing Scale

| Token Name | Value | Tailwind Utility |
| :--- | :--- | :--- |
| `--space-1` | `4px` | `p-1` / `m-1` / `gap-1` |
| `--space-2` | `6px` | `p-2` / `m-2` / `gap-2` |
| `--space-3` | `8px` | `p-3` / `m-3` / `gap-3` |
| `--space-4` | `10px` | `p-4` / `m-4` / `gap-4` |
| `--space-5` | `12px` | `p-5` / `m-5` / `gap-5` |
| `--space-6` | `14px` | `p-6` / `m-6` / `gap-6` |
| `--space-7` | `18px` | `p-7` / `m-7` / `gap-7` |
| `--space-8` | `24px` | `p-8` / `m-8` / `gap-8` |

---

### 3. Border Radius & Shadows

- **Radii**: `--radius-sm` (`6px`), `--radius-md` (`10px`), `--radius-lg` (`12px`), `--radius-pill` (`9999px`).
- **Shadows**: `--shadow-sm` (Cards), `--shadow-lg` (Windows & Modals), `--shadow-xl` (Floating toasts).

---

## Formatters Usage (`@utils/formatters`)

Never duplicate inline formatting functions inside component files. Import from `@utils/formatters`:

```typescript
import { formatDate, formatNumber, formatCurrency, formatWeight } from '@utils/formatters'

formatDate('2026-08-29') // "29/08/2026"
formatNumber(1250.5, 3)  // "1250.5"
formatCurrency(1250000)  // "₹12,50,000.00"
formatWeight(42.58, 'g') // "42.580 g"
```

---

## Business Constants (`@constants`)

All domain constants MUST be imported from `@shared/constants` (or `@constants`):

```typescript
import { METALS, UNITS, PAYMENT_METHODS, BUSINESS_TYPES } from '@constants'

console.log(METALS.GOLD)            // "Gold"
console.log(UNITS.GM)               // "Gm"
console.log(BUSINESS_TYPES.RETAIL) // "RETAIL"
```

---

## Styling Strategy: Tailwind vs. Normal CSS

### Use Tailwind CSS For:
- Screen layout grids and flexboxes (`flex`, `grid`, `items-center`, `justify-between`)
- Padding, margin, gap spacing (`p-4`, `gap-2`)
- Border colors and rounded corners (`border border-border rounded-sm`)
- Text alignment, sizes, and weights (`text-sm font-semibold text-foreground`)

### Use Normal CSS (`.css`) For:
- Complex multi-level table selector styling
- Thermal printer invoice print templates (`@media print`)
- Custom CSS keyframe animations
- Legacy component backwards compatibility (`App.css`)
