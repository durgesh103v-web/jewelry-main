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

export const migration003: Migration = {
  id: '003_add_columns',
  name: 'Add Dynamic Columns',
  up: (database: Database.Database) => {
    addColumnIfMissing(
      database,
      'accounts',
      'account_type',
      "TEXT NOT NULL DEFAULT 'Wholesale Customer'"
    )
    addColumnIfMissing(database, 'accounts', 'last_date', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'gold_fine_limit', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'accounts', 'silver_fine_limit', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'accounts', 'phone2', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'address', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'notification', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_opening_stock', 'majuri_rate', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'item_opening_stock', 'majuri', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'default_tanch', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'default_wastage', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'default_labour_rate', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'labour_rate_type', "TEXT NOT NULL DEFAULT 'Kg'")
    addColumnIfMissing(database, 'items', 'barcode_value', 'TEXT')

    database.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_items_barcode_value_not_null
      ON items(barcode_value)
      WHERE barcode_value IS NOT NULL;
    `)

    addColumnIfMissing(database, 'sale_headers', 'bill_type', "TEXT NOT NULL DEFAULT 'WHOLESALE'")
    addColumnIfMissing(database, 'sale_headers', 'taxable_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sale_headers', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sale_headers', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sale_headers', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_headers', 'bill_type', "TEXT NOT NULL DEFAULT 'WHOLESALE'")
    addColumnIfMissing(database, 'purchase_headers', 'taxable_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_headers', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_headers', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_headers', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sale_headers', 'voided_at', 'TEXT')
    addColumnIfMissing(database, 'sale_headers', 'void_reason', "TEXT NOT NULL DEFAULT ''")
  }
}
