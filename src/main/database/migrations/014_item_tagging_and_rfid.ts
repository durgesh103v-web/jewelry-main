import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration014: Migration = {
  id: '014_item_tagging_and_rfid',
  name: 'Jewellery Physical Item Tagging, Barcode, QR, RFID and Stock Take Schema',
  up: (database: Database.Database) => {
    // 1. Serialized Physical Jewellery Stock Items
    database.exec(`
      CREATE TABLE IF NOT EXISTS jewellery_stock_items (
        id TEXT PRIMARY KEY,
        stock_item_code TEXT NOT NULL UNIQUE,
        item_id TEXT NOT NULL,
        barcode TEXT UNIQUE,
        qr_code TEXT UNIQUE,
        rfid_epc TEXT UNIQUE,
        serial_number TEXT UNIQUE,
        gross_weight REAL NOT NULL,
        net_weight REAL NOT NULL,
        fine_weight REAL NOT NULL,
        purity_name TEXT DEFAULT '',
        tunch REAL NOT NULL DEFAULT 100,
        status TEXT NOT NULL DEFAULT 'IN_STOCK',
        location TEXT DEFAULT 'MAIN_STORE',
        counter TEXT DEFAULT '',
        tray TEXT DEFAULT '',
        tag_status TEXT NOT NULL DEFAULT 'ACTIVE',
        last_scanned_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_stock_items_barcode
      ON jewellery_stock_items(barcode)
      WHERE deleted_at IS NULL AND barcode IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_stock_items_qr
      ON jewellery_stock_items(qr_code)
      WHERE deleted_at IS NULL AND qr_code IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_stock_items_rfid
      ON jewellery_stock_items(rfid_epc)
      WHERE deleted_at IS NULL AND rfid_epc IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_stock_items_item_id
      ON jewellery_stock_items(item_id)
      WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_stock_items_status
      ON jewellery_stock_items(status)
      WHERE deleted_at IS NULL;

      -- 2. Stock Take Sessions
      CREATE TABLE IF NOT EXISTS stock_take_sessions (
        id TEXT PRIMARY KEY,
        session_number TEXT NOT NULL UNIQUE,
        location TEXT NOT NULL DEFAULT 'MAIN_STORE',
        status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
        total_expected INTEGER NOT NULL DEFAULT 0,
        total_scanned INTEGER NOT NULL DEFAULT 0,
        total_matched INTEGER NOT NULL DEFAULT 0,
        total_missing INTEGER NOT NULL DEFAULT 0,
        total_unexpected INTEGER NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      -- 3. Stock Take Individual Scans
      CREATE TABLE IF NOT EXISTS stock_take_scans (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        stock_item_id TEXT,
        identifier_type TEXT NOT NULL,
        identifier_value TEXT NOT NULL,
        scan_result TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        operator TEXT DEFAULT 'User',
        FOREIGN KEY (session_id) REFERENCES stock_take_sessions(id),
        FOREIGN KEY (stock_item_id) REFERENCES jewellery_stock_items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_stock_take_scans_session
      ON stock_take_scans(session_id);

      -- 4. Tag Lifecycle & Replacement History
      CREATE TABLE IF NOT EXISTS item_tag_history (
        id TEXT PRIMARY KEY,
        stock_item_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        old_barcode TEXT,
        new_barcode TEXT,
        old_rfid TEXT,
        new_rfid TEXT,
        reason TEXT DEFAULT '',
        performed_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL,
        FOREIGN KEY (stock_item_id) REFERENCES jewellery_stock_items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tag_history_stock_item
      ON item_tag_history(stock_item_id);
    `)
  }
}
