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

export const migration026: Migration = {
  id: '026_item_opening_stock_enhanced_fields',
  name: 'Add HUID, Location/Tray, Diamond Carats, Pcs and Stone Amount to Item Opening Stock',
  up: (database: Database.Database) => {
    addColumnIfMissing(database, 'item_opening_stock', 'huid', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_opening_stock', 'location', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_opening_stock', 'diamond_carats', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'item_opening_stock', 'diamond_pcs', 'INTEGER DEFAULT 0')
    addColumnIfMissing(database, 'item_opening_stock', 'stone_amount', 'REAL DEFAULT 0')
  }
}
