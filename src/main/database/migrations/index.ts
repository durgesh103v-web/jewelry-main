import { migration001 } from './001_initial_schema'
import { migration002 } from './002_indexes'
import { migration003 } from './003_add_columns'
import { migration004 } from './004_master_data_and_inventory'
import { Migration } from './types'

export const allMigrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004
]
