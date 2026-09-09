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

export const migration019: Migration = {
  id: '019_account_bank_and_contact_fields',
  name: 'Add Bank and Contact Fields to Accounts',
  up: (database: Database.Database) => {
    addColumnIfMissing(database, 'accounts', 'email', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'pincode', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'bank_name', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'bank_account_number', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'bank_ifsc', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'bank_branch', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'accounts', 'credit_limit', 'REAL NOT NULL DEFAULT 0')
  }
}
