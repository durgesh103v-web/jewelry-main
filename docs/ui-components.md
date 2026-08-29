# Reusable UI Component Library Documentation

> **Package**: `@components/ui`  
> **Source Directory**: `src/renderer/src/components/ui/`  
> **Design Tokens**: Standardized on `src/renderer/src/styles/tokens.css`  

---

## Overview

The Reusable UI Component Library provides generic, presentational React components designed for the Jewellery ERP application. All components strictly adhere to:
1. **Design Tokens First**: Colors, spacing, radii, shadows, and z-index reference CSS variables.
2. **Presentational Purity**: Zero backend IPC, SQLite, or domain-specific state inside UI primitives.
3. **Accessibility**: Keyboard navigation, focus management, semantic HTML, and ARIA attributes.
4. **TypeScript Parity**: Strictly typed props without `any`.

---

## Component Catalog

### 1. Button (`@components/ui`)
- **Usage**: Primary actions, form submission, modal actions, table icon buttons.
- **Props**: `variant` ('primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link'), `size` ('small' | 'medium' | 'large' | 'icon'), `loading`, `disabled`, `fullWidth`, `leftIcon`, `rightIcon`.
- **Example**:
  ```tsx
  <Button variant="primary" loading={saving} onClick={handleSave}>
    Save Record
  </Button>
  ```

### 2. Input & Textarea (`@components/ui`)
- **Usage**: Text, number, email, date inputs, and multiline text notes.
- **Props**: `label`, `description`, `error`, `prefix`, `suffix`, `required`, `disabled`, `fullWidth`.
- **Example**:
  ```tsx
  <Input label="Account Name" value={name} onChange={(e) => setName(e.target.value)} required />
  ```

### 3. Select (`@components/ui`)
- **Usage**: Dropdown selectors for options, account types, or categories.
- **Props**: `label`, `options` (Array of string or `{ label, value }`), `value`, `onChange`, `placeholder`.
- **Example**:
  ```tsx
  <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={['ALL', 'Sale', 'Approval']} />
  ```

### 4. Checkbox & Switch (`@components/ui`)
- **Usage**: Binary boolean toggles (e.g. Active status, Barcode item flag).
- **Example**:
  ```tsx
  <Switch label="Active Account" checked={active} onChange={setActive} />
  ```

### 5. Card Suite (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`)
- **Usage**: Surface panels, metric containers, dashboard cards.
- **Example**:
  ```tsx
  <Card>
    <CardHeader><CardTitle>Firm Info</CardTitle></CardHeader>
    <CardContent>Content here...</CardContent>
  </Card>
  ```

### 6. Badge & StatCard (`@components/ui`)
- **Usage**: Status indicators (Current, Overdue, Closed) and KPI metrics cards.
- **Example**:
  ```tsx
  <Badge variant="error" size="small">Overdue</Badge>
  <StatCard title="Today's Sale" value="12 Bills" subtitle="Majuri Rs. 15,400" />
  ```

### 7. DataTable & Pagination (`@components/ui`)
- **Usage**: Presentational table grid for registers, master lists, and report output.
- **Props**: `columns` (`Column<T>[]`), `data`, `keyExtractor`, `loading`, `emptyMessage`, `onRowClick`.
- **Example**:
  ```tsx
  <DataTable columns={columns} data={items} keyExtractor={(r) => r.id} loading={loading} />
  ```

### 8. Dialog, Drawer & ConfirmDialog (`@components/ui`)
- **Usage**: Modal dialogs, side drawers for contextual details, and confirmation prompts.
- **Example**:
  ```tsx
  <ConfirmDialog
    open={Boolean(deleteTarget)}
    title="Delete Item?"
    description="Are you sure you want to delete this item?"
    onConfirm={handleDelete}
    onCancel={() => setDeleteTarget(null)}
  />
  ```

### 9. Jewellery Domain Primitives (`MetalSelect`, `PuritySelect`, `WeightInput`, `CurrencyInput`)
- **Usage**: Domain-specific presentational input fields using `@constants`.
- **Example**:
  ```tsx
  <MetalSelect value={metal} onChange={setMetal} />
  <PuritySelect value={tunch} onChange={setTunch} />
  <CurrencyInput label="Total Amount" value={amount} onChange={setAmount} />
  ```
