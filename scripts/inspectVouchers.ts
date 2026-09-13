import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPaths = [
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'jewellery-erp.db'),
  path.join(process.env.APPDATA || '', 'jewellery-erp-desktop', 'data', 'jewellery-erp.db')
]

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) continue
  console.log('=== DB:', dbPath)
  const db = new Database(dbPath)
  const accounts = db.prepare('SELECT id, account_name FROM accounts WHERE deleted_at IS NULL').all()
  console.log('Accounts count:', accounts.length)
  const vouchers = db.prepare('SELECT * FROM cash_vouchers WHERE deleted_at IS NULL').all()
  console.log('Vouchers in table:', vouchers.length, vouchers.map((v: any) => ({ no: v.voucher_no, acc: v.account_id, amt: v.amount })))
  const joined = db.prepare('SELECT cv.*, a.account_name FROM cash_vouchers cv INNER JOIN accounts a ON a.id = cv.account_id WHERE cv.deleted_at IS NULL').all()
  console.log('Joined vouchers count:', joined.length)
}
