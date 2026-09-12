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

export const migration024: Migration = {
  id: '024_item_stamp_enhanced_fields',
  name: 'Add Purity Karat, Tanch, Short Code and Hallmark Flag to Item Stamps',
  up: (database: Database.Database) => {
    addColumnIfMissing(database, 'item_stamps', 'purity_karat', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_stamps', 'purity_tanch', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'item_stamps', 'short_code', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_stamps', 'is_hallmarked', 'INTEGER DEFAULT 1')

    // Backfill intelligent defaults for existing standard stamps
    database.exec(`
      UPDATE item_stamps SET purity_karat = '22K', purity_tanch = 91.66, short_code = '916' WHERE (stamp_name LIKE '%916%' OR stamp_name LIKE '%22K%') AND (purity_karat IS NULL OR purity_karat = '');
      UPDATE item_stamps SET purity_karat = '18K', purity_tanch = 75.00, short_code = '750' WHERE (stamp_name LIKE '%750%' OR stamp_name LIKE '%18K%') AND (purity_karat IS NULL OR purity_karat = '');
      UPDATE item_stamps SET purity_karat = '14K', purity_tanch = 58.33, short_code = '585' WHERE (stamp_name LIKE '%585%' OR stamp_name LIKE '%14K%') AND (purity_karat IS NULL OR purity_karat = '');
      UPDATE item_stamps SET purity_karat = '24K', purity_tanch = 99.90, short_code = '999' WHERE (stamp_name LIKE '%999%' OR stamp_name LIKE '%24K%') AND (purity_karat IS NULL OR purity_karat = '');
      UPDATE item_stamps SET purity_karat = '92.5%', purity_tanch = 92.50, short_code = '925' WHERE (stamp_name LIKE '%925%' OR stamp_name LIKE '%Sterling%') AND (purity_karat IS NULL OR purity_karat = '');
      UPDATE item_stamps SET purity_karat = '80.0%', purity_tanch = 80.00, short_code = '800' WHERE (stamp_name LIKE '%800%') AND (purity_karat IS NULL OR purity_karat = '');
    `)
  }
}
