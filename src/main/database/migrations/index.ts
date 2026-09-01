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
  migration017
]
