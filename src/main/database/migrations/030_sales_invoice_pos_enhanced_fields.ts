import Database from 'better-sqlite3'
import { Migration } from './types'

function addColumnIfMissing(
  database: Database.Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[]
  const exists = columns.some((column) => column.name === columnName)

  if (!exists) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`)
  }
}

export const migration030: Migration = {
  id: '030_sales_invoice_pos_enhanced_fields',
  name: 'Add HUID, Salesperson, Diamond Specs, Making Discount, and Delivery Status to Sales Invoices',
  up: (database: Database.Database) => {
    // Add enhanced fields to sales_invoices
    addColumnIfMissing(database, 'sales_invoices', 'salesperson_id', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'sales_invoices', 'salesperson_name', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'sales_invoices', 'delivery_status', "TEXT DEFAULT 'Delivered'")
    addColumnIfMissing(database, 'sales_invoices', 'invoice_discount', 'REAL DEFAULT 0')

    // Add enhanced fields to sales_invoice_items
    addColumnIfMissing(database, 'sales_invoice_items', 'huid', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'sales_invoice_items', 'diamond_carats', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoice_items', 'diamond_pcs', 'INTEGER DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoice_items', 'stone_amount', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoice_items', 'making_discount', 'REAL DEFAULT 0')
  }
}
