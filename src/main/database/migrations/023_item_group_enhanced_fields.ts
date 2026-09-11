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

export const migration023: Migration = {
  id: '023_item_group_enhanced_fields',
  name: 'Add Enhanced Metadata and Defaults to Item Groups',
  up: (database: Database.Database) => {
    addColumnIfMissing(database, 'item_groups', 'prefix', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_groups', 'hsn_code', "TEXT DEFAULT '7113'")
    addColumnIfMissing(database, 'item_groups', 'gst_rate', 'REAL DEFAULT 3.0')
    addColumnIfMissing(database, 'item_groups', 'default_purity', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_groups', 'default_labour_rate', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'item_groups', 'default_labour_type', "TEXT DEFAULT 'PER_GRAM'")
    addColumnIfMissing(database, 'item_groups', 'default_wastage', 'REAL DEFAULT 0')
  }
}
