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

export const migration021: Migration = {
  id: '021_item_master_expanded_fields',
  name: 'Add Item Code, Karat, GST Rate, Studded, HUID, Stock and Notes to Items',
  up: (database: Database.Database) => {
    addColumnIfMissing(database, 'items', 'item_code', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'items', 'purity_karat', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'items', 'gst_rate', 'REAL NOT NULL DEFAULT 3.0')
    addColumnIfMissing(database, 'items', 'is_studded', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'stone_deduction_type', "TEXT DEFAULT 'None'")
    addColumnIfMissing(database, 'items', 'huid_required', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'min_stock_qty', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'min_stock_weight', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'items', 'description', "TEXT DEFAULT ''")
  }
}
