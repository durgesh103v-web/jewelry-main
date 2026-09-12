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

export const migration029: Migration = {
  id: '029_cash_fine_opening_enhanced_fields',
  name: 'Add Location, Rate, Amount, Bank & Petty Cash, and Platinum Turnover to Cash Fine Opening',
  up: (database: Database.Database) => {
    // Add enhanced fields to cash_fine_opening_lines
    addColumnIfMissing(database, 'cash_fine_opening_lines', 'location', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'cash_fine_opening_lines', 'rate', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'cash_fine_opening_lines', 'amount', 'REAL DEFAULT 0')

    // Add enhanced fields to cash_fine_opening_settings
    addColumnIfMissing(database, 'cash_fine_opening_settings', 'opening_bank_balance', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'cash_fine_opening_settings', 'opening_petty_cash', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'cash_fine_opening_settings', 'platinum_purchase_fine', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'cash_fine_opening_settings', 'platinum_purchase_amount', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'cash_fine_opening_settings', 'platinum_sale_fine', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'cash_fine_opening_settings', 'platinum_sale_amount', 'REAL DEFAULT 0')
  }
}
