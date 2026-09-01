import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration017: Migration = {
  id: '017_gold_savings_scheme',
  name: 'Canonical Gold Savings Scheme, Kitty and Monthly Jewellery Deposit Schema',
  up: (database: Database.Database) => {
    database.exec(`
      -- 1. Scheme Master
      CREATE TABLE IF NOT EXISTS schemes (
        id TEXT PRIMARY KEY,
        scheme_code TEXT NOT NULL UNIQUE,
        scheme_name TEXT NOT NULL,
        scheme_type TEXT NOT NULL DEFAULT 'MONEY_BASED', -- MONEY_BASED, GOLD_WEIGHT_BASED
        duration_months INTEGER NOT NULL DEFAULT 11,
        installment_type TEXT NOT NULL DEFAULT 'FIXED', -- FIXED, VARIABLE
        fixed_installment_amount REAL NOT NULL DEFAULT 0,
        bonus_type TEXT NOT NULL DEFAULT 'ONE_MONTH_INSTALLMENT', -- FIXED_AMOUNT, PERCENTAGE, ONE_MONTH_INSTALLMENT, NONE
        bonus_value REAL NOT NULL DEFAULT 0,
        description TEXT DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_scheme_code ON schemes(scheme_code);
      CREATE INDEX IF NOT EXISTS idx_scheme_type ON schemes(scheme_type);

      -- 2. Customer Scheme Accounts (Enrollments)
      CREATE TABLE IF NOT EXISTS scheme_accounts (
        id TEXT PRIMARY KEY,
        account_number TEXT NOT NULL UNIQUE,
        scheme_id TEXT NOT NULL REFERENCES schemes(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        start_date TEXT NOT NULL,
        maturity_date TEXT NOT NULL,
        installment_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, MATURED, REDEEMED, CANCELLED, CLOSED
        installments_expected INTEGER NOT NULL DEFAULT 11,
        installments_paid INTEGER NOT NULL DEFAULT 0,
        total_amount_paid REAL NOT NULL DEFAULT 0,
        bonus_amount REAL NOT NULL DEFAULT 0,
        gold_entitlement_grams REAL NOT NULL DEFAULT 0,
        total_redeemed_amount REAL NOT NULL DEFAULT 0,
        balance_amount REAL NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scheme_acc_num ON scheme_accounts(account_number);
      CREATE INDEX IF NOT EXISTS idx_scheme_acc_cust ON scheme_accounts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_scheme_acc_scheme ON scheme_accounts(scheme_id);
      CREATE INDEX IF NOT EXISTS idx_scheme_acc_status ON scheme_accounts(status);

      -- 3. Scheme Installment Ledger
      CREATE TABLE IF NOT EXISTS scheme_installments (
        id TEXT PRIMARY KEY,
        scheme_account_id TEXT NOT NULL REFERENCES scheme_accounts(id),
        installment_number INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        paid_date TEXT,
        due_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        gold_rate REAL NOT NULL DEFAULT 0,
        gold_entitlement_grams REAL NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'CASH',
        payment_reference TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'DUE', -- DUE, PAID, PARTIAL, OVERDUE, WAIVED
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_si_acc ON scheme_installments(scheme_account_id);
      CREATE INDEX IF NOT EXISTS idx_si_due_date ON scheme_installments(due_date);
      CREATE INDEX IF NOT EXISTS idx_si_status ON scheme_installments(status);

      -- 4. Scheme Redemptions (POS / Sale Redemption)
      CREATE TABLE IF NOT EXISTS scheme_redemptions (
        id TEXT PRIMARY KEY,
        redemption_number TEXT NOT NULL UNIQUE,
        scheme_account_id TEXT NOT NULL REFERENCES scheme_accounts(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        redemption_date TEXT NOT NULL,
        redeemed_amount REAL NOT NULL DEFAULT 0,
        bonus_amount_applied REAL NOT NULL DEFAULT 0,
        gold_grams_redeemed REAL NOT NULL DEFAULT 0,
        sales_invoice_id TEXT,
        status TEXT NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, REVERSED
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sr_acc ON scheme_redemptions(scheme_account_id);
      CREATE INDEX IF NOT EXISTS idx_sr_cust ON scheme_redemptions(customer_id);

      -- 5. Scheme Refunds (Early Cancellation)
      CREATE TABLE IF NOT EXISTS scheme_refunds (
        id TEXT PRIMARY KEY,
        refund_number TEXT NOT NULL UNIQUE,
        scheme_account_id TEXT NOT NULL REFERENCES scheme_accounts(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        refund_date TEXT NOT NULL,
        refund_amount REAL NOT NULL DEFAULT 0,
        deduction_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'CASH',
        payment_reference TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sref_acc ON scheme_refunds(scheme_account_id);

      -- 6. Scheme Timeline / Audit
      CREATE TABLE IF NOT EXISTS scheme_timeline_events (
        id TEXT PRIMARY KEY,
        scheme_account_id TEXT NOT NULL REFERENCES scheme_accounts(id),
        event_type TEXT NOT NULL,
        description TEXT NOT NULL,
        performed_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ste_acc ON scheme_timeline_events(scheme_account_id);
    `)
  }
}
