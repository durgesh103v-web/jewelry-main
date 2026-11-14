import { migration001 } from './001_initial_schema'
import { migration002 } from './002_indexes'
import { migration003 } from './003_add_columns'
import { migration004 } from './004_master_data_and_inventory'
import { migration005 } from './005_customers_and_suppliers'
import { migration006 } from './006_gold_rates_and_pricing'
import { migration007 } from './007_quotations_and_orders'
import { migration008 } from './008_customer_advances'
import { migration009 } from './009_old_gold_and_exchange'
import { migration010 } from './010_sales_invoices'
import { migration011 } from './011_purchase_invoices'
import { migration012 } from './012_return_transactions'
import { migration013 } from './013_gst_and_tax_engine'
import { migration014 } from './014_item_tagging_and_rfid'
import { migration015 } from './015_job_work_and_manufacturing'
import { migration016 } from './016_repair_and_customer_service'
import { migration017 } from './017_gold_savings_scheme'
import { migration018 } from './018_vendor_consignment_and_memo'
import { migration019 } from './019_account_bank_and_contact_fields'
import { migration020 } from './020_seed_standard_account_groups'
import { migration021 } from './021_item_master_expanded_fields'
import { migration022 } from './022_seed_standard_items_and_groups'
import { migration023 } from './023_item_group_enhanced_fields'
import { migration024 } from './024_item_stamp_enhanced_fields'
import { migration025 } from './025_item_design_enhanced_fields'
import { migration026 } from './026_item_opening_stock_enhanced_fields'
import { migration027 } from './027_seed_item_opening_stock_data'
import { migration028 } from './028_firm_master_enhanced_fields'
import { migration029 } from './029_cash_fine_opening_enhanced_fields'
import { migration030 } from './030_sales_invoice_pos_enhanced_fields'
import { migration031 } from './031_central_provisioning'
import { Migration } from './types'

export const allMigrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
  migration011,
  migration012,
  migration013,
  migration014,
  migration015,
  migration016,
  migration017,
  migration018,
  migration019,
  migration020,
  migration021,
  migration022,
  migration023,
  migration024,
  migration025,
  migration026,
  migration027,
  migration028,
  migration029,
  migration030,
  migration031
]
