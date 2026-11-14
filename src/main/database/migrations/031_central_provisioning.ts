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

export const migration031: Migration = {
  id: '031_central_provisioning',
  name: 'Add Central Showroom Provisioning, Temporary Password Flag and Credential Versioning',
  up: (database: Database.Database) => {
    // Add central provisioning fields to users table idempotently
    addColumnIfMissing(database, 'users', 'is_temporary_password', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'users', 'central_shop_id', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'users', 'credential_version', 'INTEGER NOT NULL DEFAULT 1')

    // Create index on central_shop_id
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_central_shop_id ON users(central_shop_id);
    `)
  }
}