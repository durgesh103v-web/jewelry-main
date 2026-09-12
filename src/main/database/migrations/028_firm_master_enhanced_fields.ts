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

export const migration028: Migration = {
  id: '028_firm_master_enhanced_fields',
  name: 'Add BIS Hallmark, State Code, Bank Details, UPI ID, Tagline & Buyback Policy to Firm Master',
  up: (database: Database.Database) => {
    addColumnIfMissing(database, 'firm_settings', 'tagline', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'state_code', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'bis_license_no', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'hallmark_center', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'legal_metrology_no', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'bank_name', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'bank_branch', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'bank_account_no', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'bank_ifsc', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'bank_account_name', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'upi_id', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'invoice_footer_note', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'buyback_policy', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'authorised_signatory', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'firm_settings', 'logo_url', "TEXT DEFAULT ''")
  }
}
