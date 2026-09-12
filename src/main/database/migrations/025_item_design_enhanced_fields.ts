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

export const migration025: Migration = {
  id: '025_item_design_enhanced_fields',
  name: 'Add Short Code, Default Labour Rate, Labour Type and Wastage to Item Designs',
  up: (database: Database.Database) => {
    addColumnIfMissing(database, 'item_designs', 'short_code', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'item_designs', 'default_labour_rate', 'REAL DEFAULT 0')
    addColumnIfMissing(database, 'item_designs', 'default_labour_type', "TEXT DEFAULT 'PER_GRAM'")
    addColumnIfMissing(database, 'item_designs', 'default_wastage', 'REAL DEFAULT 0')

    // Backfill intelligent defaults for existing standard designs
    database.exec(`
      UPDATE item_designs SET short_code = 'TEM', default_labour_rate = 650, default_labour_type = 'PER_GRAM', default_wastage = 5.0 WHERE (design_name LIKE '%Antique%' OR design_name LIKE '%Temple%') AND (short_code IS NULL OR short_code = '');
      UPDATE item_designs SET short_code = 'BMB', default_labour_rate = 250, default_labour_type = 'PER_GRAM', default_wastage = 2.0 WHERE (design_name LIKE '%Bombay%' OR design_name LIKE '%Polish%') AND (short_code IS NULL OR short_code = '');
      UPDATE item_designs SET short_code = 'CZD', default_labour_rate = 450, default_labour_type = 'PER_GRAM', default_wastage = 3.5 WHERE (design_name LIKE '%CZ%' OR design_name LIKE '%Studded%') AND (short_code IS NULL OR short_code = '');
      UPDATE item_designs SET short_code = 'CAL', default_labour_rate = 550, default_labour_type = 'PER_GRAM', default_wastage = 4.0 WHERE (design_name LIKE '%Calcutta%' OR design_name LIKE '%Handmade%') AND (short_code IS NULL OR short_code = '');
      UPDATE item_designs SET short_code = 'CNC', default_labour_rate = 220, default_labour_type = 'PER_GRAM', default_wastage = 1.5 WHERE (design_name LIKE '%Casting%' OR design_name LIKE '%CNC%') AND (short_code IS NULL OR short_code = '');
      UPDATE item_designs SET short_code = 'PLN', default_labour_rate = 180, default_labour_type = 'PER_GRAM', default_wastage = 1.0 WHERE (design_name LIKE '%Plain%' OR design_name LIKE '%Solid%') AND (short_code IS NULL OR short_code = '');
      UPDATE item_designs SET short_code = 'FIL', default_labour_rate = 600, default_labour_type = 'PER_GRAM', default_wastage = 4.5 WHERE (design_name LIKE '%Rajkot%' OR design_name LIKE '%Filigree%' OR design_name LIKE '%Fillgree%') AND (short_code IS NULL OR short_code = '');
      UPDATE item_designs SET short_code = 'SOL', default_labour_rate = 1200, default_labour_type = 'PER_PIECE', default_wastage = 0 WHERE (design_name LIKE '%Solitaire%') AND (short_code IS NULL OR short_code = '');
    `)
  }
}
