/**
 * ============================================================================
 * JEWELLERY ERP — PRODUCTION-LIKE DEVELOPMENT / DEMO SEED
 * ============================================================================
 *
 * DEVELOPMENT / DEMO DATA ONLY.
 * NEVER EXECUTE AUTOMATICALLY IN PRODUCTION.
 *
 * Populates realistic Indian jewellery showroom data through existing
 * canonical services and repositories so the Dashboard UI and executive reports
 * display authentic, balanced business information.
 *
 * Idempotency: Uses deterministic identifiers (codes, keys, and UUIDs)
 * so multiple runs safely upsert or skip existing records without creating
 * duplicates, negative inventories, or orphaned foreign keys.
 * ============================================================================
 */

import dayjs from 'dayjs'
import { getDatabase } from '../connection'
import { salesInvoiceService } from '../../services/salesInvoice.service'
import { purchaseInvoiceService } from '../../services/purchaseInvoice.service'
import { customerOrderService } from '../../services/customerOrder.service'
import { quotationService } from '../../services/quotation.service'
import { advanceService } from '../../services/advance.service'
import { inventoryMovementService } from '../../services/inventoryMovement.service'
import { roundNumber } from '../../../shared/jewelleryFormula'

export interface SeedSummaryReport {
  firmName: string
  customersCount: number
  suppliersCount: number
  karigarsCount: number
  itemsCount: number
  stockItemsCount: number
  openingStockPcs: number
  purchaseInvoicesCount: number
  todayPurchasesAmount: number
  salesInvoicesCount: number
  todaySalesAmount: number
  customerOrdersCount: number
  quotationsCount: number
  customerAdvancesCount: number
  consignmentsCount: number
  repairsCount: number
  manufacturingOrdersCount: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalStockPieces: number
  totalReceivables: number
  totalPayables: number
  cashClosingBalance: number
}

// ----------------------------------------------------------------------------
// SEED RUNNER FUNCTION
// ----------------------------------------------------------------------------
export async function seedDevelopmentData(): Promise<SeedSummaryReport> {
  const db = getDatabase()
  const today = dayjs().format('YYYY-MM-DD')
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  console.log('Starting Jewellery ERP Development Seed...')
  console.log(`Current Date: ${today}`)

  // ==========================================================================
  // 1. FIRM / SHOP CONFIGURATION
  // ==========================================================================
  console.log('Configuring Shop Firm Settings...')
  const existingFirm = db
    .prepare(`SELECT id, firm_name FROM firm_settings WHERE id = 'default-firm'`)
    .get() as { id: string; firm_name: string } | undefined

  if (!existingFirm || !existingFirm.firm_name || existingFirm.firm_name === 'Sri Lakshmi Jewellers') {
    db.prepare(
      `INSERT INTO firm_settings (
        id, firm_name, owner_name, address, city, state, pincode,
        mobile_number, whatsapp_number, email, gst_no, pan_no,
        bill_title, bill_prefix, terms, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        firm_name = excluded.firm_name,
        owner_name = excluded.owner_name,
        address = excluded.address,
        city = excluded.city,
        state = excluded.state,
        pincode = excluded.pincode,
        mobile_number = excluded.mobile_number,
        whatsapp_number = excluded.whatsapp_number,
        email = excluded.email,
        gst_no = excluded.gst_no,
        pan_no = excluded.pan_no,
        updated_at = excluded.updated_at`
    ).run(
      'default-firm',
      'Shree Jewellery',
      'R. Alston Vishwakarma',
      '48, Cathedral Road, Gopalapuram',
      'Chennai',
      'Tamil Nadu',
      '600086',
      '9840123456',
      '9840123456',
      'contact@shreejewellery.com',
      '33AABCS1429B1Z8',
      'AABCS1429B',
      'TAX INVOICE',
      'INV',
      '1. Goods once sold will not be exchanged or taken back without original invoice.\n2. 100% BIS Hallmarked HUID Jewellery.\n3. Making charges and taxes as applicable.',
      now,
      now
    )
  }

  // Baseline Cash and Opening Settings
  db.prepare(
    `INSERT INTO cash_fine_opening_settings (
      id, gold_purchase_fine, gold_purchase_amount, gold_sale_fine, gold_sale_amount,
      silver_purchase_fine, silver_purchase_amount, silver_sale_fine, silver_sale_amount,
      opening_cash, created_at, updated_at
    ) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      opening_cash = excluded.opening_cash,
      updated_at = excluded.updated_at`
  ).run('default-cash-fine-opening', 150000, now, now)

  // ==========================================================================
  // 2. ACCOUNT GROUPS & CORE MASTER DATA
  // ==========================================================================
  console.log('Verifying Core Master Data...')

  // Account Groups
  const ensureAccountGroup = (name: string, type: string) => {
    const existing = db.prepare(`SELECT id FROM account_groups WHERE group_name = ? AND deleted_at IS NULL LIMIT 1`).get(name) as any
    if (existing) return existing.id
    const id = `grp-acc-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    db.prepare(`
      INSERT INTO account_groups (id, group_name, group_type, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, type, `${name} Account Group`, now, now)
    return id
  }

  const debtorsGroupId = ensureAccountGroup('Sundry Debtors', 'Assets')
  const creditorsGroupId = ensureAccountGroup('Sundry Creditors', 'Liabilities')
  ensureAccountGroup('Cash-in-Hand', 'Assets')
  ensureAccountGroup('Bank Accounts', 'Assets')
  ensureAccountGroup('Sales Accounts', 'Income')
  ensureAccountGroup('Purchase Accounts', 'Expense')
  ensureAccountGroup('Direct Expenses', 'Expense')
  ensureAccountGroup('Indirect Expenses', 'Expense')

  // Locations
  const ensureLocation = () => {
    const loc = db.prepare(`SELECT id FROM locations WHERE id = 'loc-showroom' OR location_code = 'SHOWROOM' LIMIT 1`).get() as any
    if (loc) return loc.id
    const anyLoc = db.prepare(`SELECT id FROM locations LIMIT 1`).get() as any
    if (anyLoc) return anyLoc.id
    db.prepare(`
      INSERT INTO locations (id, location_name, location_code, description, active, created_at, updated_at)
      VALUES ('loc-showroom', 'Showroom Floor', 'SHOWROOM', 'Main sales floor and display counters', 1, ?, ?)
    `).run(now, now)
    return 'loc-showroom'
  }
  const showroomLocId = ensureLocation()

  // Item Groups helper
  const resolveItemGroup = (name: string, metal: string) => {
    let found = db.prepare(`SELECT id FROM item_groups WHERE group_name = ? AND deleted_at IS NULL LIMIT 1`).get(name) as any
    if (found) return found.id
    found = db.prepare(`SELECT id FROM item_groups WHERE group_name LIKE ? AND deleted_at IS NULL LIMIT 1`).get(`%${name}%`) as any
    if (found) return found.id
    const id = `grp-${metal.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    db.prepare(`
      INSERT INTO item_groups (id, group_name, metal_type, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, metal, `${name} Group`, now, now)
    return id
  }

  const goldGroupId = resolveItemGroup('Gold Jewellery', 'Gold')
  const silverGroupId = resolveItemGroup('Silver Jewellery', 'Silver')
  const diamondGroupId = resolveItemGroup('Diamond Jewellery', 'Diamond')

  // Stamps helper
  const resolveStamp = (name: string, metal: string, description?: string) => {
    let found = db.prepare(`SELECT id FROM item_stamps WHERE (stamp_name = ? OR stamp_name LIKE ?) AND metal_type = ? AND deleted_at IS NULL LIMIT 1`).get(name, `%${name}%`, metal) as any
    if (found) return found.id
    const id = `stamp-${metal.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    db.prepare(`
      INSERT INTO item_stamps (id, stamp_name, metal_type, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, metal, description || `${name} Stamp`, now, now)
    return id
  }

  const stamp916Id = resolveStamp('916', 'Gold', '22 Karat 916 Hallmark Stamp')
  const stamp750Id = resolveStamp('750', 'Gold', '18 Karat 750 Hallmark Stamp')
  const stamp925Id = resolveStamp('925', 'Silver', '925 Sterling Silver Stamp')
  const stamp999Id = resolveStamp('999', 'Gold', '24 Karat 999 Fine Stamp')

  // Designs helper
  const resolveDesign = (name: string, metal: string) => {
    let found = db.prepare(`SELECT id FROM item_designs WHERE (design_name = ? OR design_name LIKE ?) AND metal_type = ? AND deleted_at IS NULL LIMIT 1`).get(name, `%${name}%`, metal) as any
    if (found) return found.id
    const id = `des-${metal.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    db.prepare(`
      INSERT INTO item_designs (id, design_name, metal_type, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, metal, `${name} Style Jewellery`, now, now)
    return id
  }

  const designClassicId = resolveDesign('Classic', 'Gold')
  const designAntiqueId = resolveDesign('Antique', 'Gold')
  const designFiligreeId = resolveDesign('Filigree', 'Gold')
  const designBridalId = resolveDesign('Bridal', 'Gold')
  const designContemporaryId = resolveDesign('Contemporary', 'Gold')
  const designTempleId = resolveDesign('Temple', 'Gold')
  const designDailyWearId = resolveDesign('Daily Wear', 'Gold')

  // Categories helper
  const ensureRootCategory = () => {
    const root = db.prepare(`SELECT id FROM categories WHERE id = 'cat-jewellery' OR parent_id IS NULL LIMIT 1`).get() as any
    if (root) return root.id
    db.prepare(`
      INSERT INTO categories (id, name, code, parent_id, metal_type, active, sort_order, created_at, updated_at)
      VALUES ('cat-jewellery', 'Jewellery', 'JWL', NULL, 'Gold', 1, 1, ?, ?)
    `).run(now, now)
    return 'cat-jewellery'
  }
  const rootCatId = ensureRootCategory()

  const resolveCategory = (id: string, name: string, code: string) => {
    let found = db.prepare(`SELECT id FROM categories WHERE id = ? OR code = ? OR name = ? LIMIT 1`).get(id, code, name) as any
    if (found) return found.id
    db.prepare(`
      INSERT INTO categories (id, name, code, parent_id, metal_type, active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'Gold', 1, 10, ?, ?)
    `).run(id, name, code, rootCatId, now, now)
    return id
  }

  const catRingsId = resolveCategory('cat-rings', 'Rings', 'RNG')
  const catBanglesId = resolveCategory('cat-bangles', 'Bangles', 'BNG')
  const catChainsId = resolveCategory('cat-chains', 'Chains', 'CHN')
  const catNecklacesId = resolveCategory('cat-necklaces', 'Necklaces', 'NCK')
  const catEarringsId = resolveCategory('cat-earrings', 'Earrings', 'EAR')
  const catPendantsId = resolveCategory('cat-pendants', 'Pendants', 'PND')
  const catBraceletsId = resolveCategory('cat-bracelets', 'Bracelets', 'BRC')
  const catMangalsutraId = resolveCategory('cat-mangalsutra', 'Mangalsutra', 'MNG')
  const catNosepinsId = resolveCategory('cat-nosepins', 'Nose Pins', 'NSP')
  const catCoinsId = resolveCategory('cat-coins', 'Coins & Bullion', 'COI')

  // Purities helper
  const resolvePurity = (id: string, metal: string, name: string, karat: string, fineness: number, percentage: number) => {
    let found = db.prepare(`SELECT id FROM purity_masters WHERE id = ? OR (metal_type = ? AND (karat = ? OR fineness = ?)) LIMIT 1`).get(id, metal, karat, fineness) as any
    if (found) return found.id
    db.prepare(`
      INSERT INTO purity_masters (id, metal_type, name, karat, fineness, percentage, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, metal, name, karat, fineness, percentage, now, now)
    return id
  }

  const purG24kId = resolvePurity('pur-g24k', 'Gold', '24 Karat (999)', '24K', 999, 99.9)
  const purG22kId = resolvePurity('pur-g22k', 'Gold', '22 Karat (916)', '22K', 916, 91.6)
  const purG18kId = resolvePurity('pur-g18k', 'Gold', '18 Karat (750)', '18K', 750, 75.0)
  const purS999Id = resolvePurity('pur-s999', 'Silver', '999 Fine Silver', '999', 999, 99.9)
  const purS925Id = resolvePurity('pur-s925', 'Silver', '925 Sterling Silver', '925', 925, 92.5)

  // ==========================================================================
  // 3. TODAY'S LIVE METAL RATES
  // ==========================================================================
  console.log("Setting Today's Live Metal Rates...")
  const ratesToSet = [
    { id: `rate-g24k-${today}`, metal: 'Gold', purityId: purG24kId, name: '24 Karat (999)', karat: '24K', fineness: 999, rate: 7485.0 },
    { id: `rate-g22k-${today}`, metal: 'Gold', purityId: purG22kId, name: '22 Karat (916)', karat: '22K', fineness: 916, rate: 6860.0 },
    { id: `rate-g18k-${today}`, metal: 'Gold', purityId: purG18kId, name: '18 Karat (750)', karat: '18K', fineness: 750, rate: 5615.0 },
    { id: `rate-s999-${today}`, metal: 'Silver', purityId: purS999Id, name: '999 Fine Silver', karat: '999', fineness: 999, rate: 88.5 },
    { id: `rate-s925-${today}`, metal: 'Silver', purityId: purS925Id, name: '925 Sterling Silver', karat: '925', fineness: 925, rate: 82.0 }
  ]

  const insertRateStmt = db.prepare(
    `INSERT INTO gold_rates (
      id, metal_type, purity_id, purity_name, purity_karat, fineness,
      rate_per_gram, effective_date, effective_time, notes, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '09:00:00', 'Showroom Live Rate', 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rate_per_gram = excluded.rate_per_gram,
      effective_date = excluded.effective_date,
      updated_at = excluded.updated_at`
  )

  for (const r of ratesToSet) {
    insertRateStmt.run(r.id, r.metal, r.purityId, r.name, r.karat, r.fineness, r.rate, today, now, now)
  }

  // ==========================================================================
  // 4. JEWELLERY ITEM MASTERS (17 Core Masters)
  // ==========================================================================
  console.log('Seeding Jewellery Item Masters...')
  const itemsSeedData = [
    { id: 'item-22k-ring', name: '22K Gold Plain Ring', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designClassicId, cat: catRingsId, hsn: '7113', wt: 3.5, tanch: 91.6, wastage: 3.5, labour: 450 },
    { id: 'item-22k-bangle', name: '22K Gold Antique Bangle', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designAntiqueId, cat: catBanglesId, hsn: '7113', wt: 24.5, tanch: 91.6, wastage: 4.5, labour: 550 },
    { id: 'item-22k-chain', name: '22K Gold Rope Chain', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designClassicId, cat: catChainsId, hsn: '7113', wt: 14.5, tanch: 91.6, wastage: 3.0, labour: 420 },
    { id: 'item-22k-bridal-neck', name: '22K Bridal Necklace', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designBridalId, cat: catNecklacesId, hsn: '7113', wt: 48.2, tanch: 91.6, wastage: 5.5, labour: 650 },
    { id: 'item-22k-temple-choker', name: '22K Temple Choker', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designTempleId, cat: catNecklacesId, hsn: '7113', wt: 38.6, tanch: 91.6, wastage: 6.0, labour: 700 },
    { id: 'item-22k-jhumka', name: '22K Gold Jhumka Earrings', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designAntiqueId, cat: catEarringsId, hsn: '7113', wt: 9.8, tanch: 91.6, wastage: 4.0, labour: 520 },
    { id: 'item-22k-studs', name: '22K Gold Stud Earrings', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designDailyWearId, cat: catEarringsId, hsn: '7113', wt: 4.2, tanch: 91.6, wastage: 3.5, labour: 450 },
    { id: 'item-22k-pendant', name: '22K Gold Floral Pendant', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designContemporaryId, cat: catPendantsId, hsn: '7113', wt: 6.4, tanch: 91.6, wastage: 3.5, labour: 480 },
    { id: 'item-22k-bracelet', name: '22K Gold Men Bracelet', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designClassicId, cat: catBraceletsId, hsn: '7113', wt: 22.0, tanch: 91.6, wastage: 3.8, labour: 480 },
    { id: 'item-22k-mangalsutra', name: '22K Traditional Mangalsutra', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designClassicId, cat: catMangalsutraId, hsn: '7113', wt: 18.5, tanch: 91.6, wastage: 4.2, labour: 500 },
    { id: 'item-22k-nosepin', name: '22K Gold Nose Pin', metal: 'Gold', group: goldGroupId, stamp: stamp916Id, design: designDailyWearId, cat: catNosepinsId, hsn: '7113', wt: 0.85, tanch: 91.6, wastage: 2.0, labour: 300 },
    { id: 'item-24k-coin', name: '24K Lakshmi Gold Coin 8g', metal: 'Gold', group: goldGroupId, stamp: stamp999Id, design: designClassicId, cat: catCoinsId, hsn: '7108', wt: 8.0, tanch: 99.9, wastage: 0.0, labour: 150 },
    { id: 'item-18k-dia-ring', name: '18K Diamond Solitaire Ring', metal: 'Diamond', group: diamondGroupId, stamp: stamp750Id, design: designContemporaryId, cat: catRingsId, hsn: '7113', wt: 4.12, tanch: 75.0, wastage: 2.5, labour: 850 },
    { id: 'item-18k-dia-pendant', name: '18K Diamond Heart Pendant', metal: 'Diamond', group: diamondGroupId, stamp: stamp750Id, design: designContemporaryId, cat: catPendantsId, hsn: '7113', wt: 3.25, tanch: 75.0, wastage: 2.5, labour: 750 },
    { id: 'item-18k-dia-bracelet', name: '18K Diamond Tennis Bracelet', metal: 'Diamond', group: diamondGroupId, stamp: stamp750Id, design: designContemporaryId, cat: catBraceletsId, hsn: '7113', wt: 12.8, tanch: 75.0, wastage: 3.0, labour: 1100 },
    { id: 'item-925-slv-bracelet', name: '925 Silver Filigree Bracelet', metal: 'Silver', group: silverGroupId, stamp: stamp925Id, design: designFiligreeId, cat: catBraceletsId, hsn: '7113', wt: 18.75, tanch: 92.5, wastage: 2.0, labour: 90 },
    { id: 'item-925-slv-payal', name: '925 Silver Traditional Payal', metal: 'Silver', group: silverGroupId, stamp: stamp925Id, design: designAntiqueId, cat: catBanglesId, hsn: '7113', wt: 38.5, tanch: 92.5, wastage: 3.0, labour: 75 }
  ]

  const insertItemStmt = db.prepare(
    `INSERT INTO items (
      id, item_name, metal_type, item_group_id, default_stamp_id, default_design_id,
      category_id, location_id, item_status, barcode_item, gst_hsn_code, fixed_weight_per_pcs,
      default_tanch, default_wastage, default_labour_rate, labour_rate_type, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IN_STOCK', 1, ?, ?, ?, ?, ?, 'Gm', 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      item_name = excluded.item_name,
      metal_type = excluded.metal_type,
      item_group_id = excluded.item_group_id,
      default_stamp_id = excluded.default_stamp_id,
      default_design_id = excluded.default_design_id,
      category_id = excluded.category_id,
      location_id = excluded.location_id,
      gst_hsn_code = excluded.gst_hsn_code,
      fixed_weight_per_pcs = excluded.fixed_weight_per_pcs,
      default_tanch = excluded.default_tanch,
      default_wastage = excluded.default_wastage,
      default_labour_rate = excluded.default_labour_rate,
      updated_at = excluded.updated_at`
  )

  for (const item of itemsSeedData) {
    insertItemStmt.run(
      item.id,
      item.name,
      item.metal,
      item.group,
      item.stamp,
      item.design,
      item.cat,
      showroomLocId,
      item.hsn,
      item.wt,
      item.tanch,
      item.wastage,
      item.labour,
      now,
      now
    )
  }

  // ==========================================================================
  // 5. CUSTOMERS & LINKED ACCOUNTS (20 Realistic Customers)
  // ==========================================================================
  console.log('Seeding Customers & Accounts...')
  const customersSeedData = [
    { id: 'seed-cust-01', code: 'CUST-1001', name: 'Priya Sharma', mobile: '9840112233', city: 'Chennai', addr: '12, Anna Nagar West, Chennai', gstin: '', pan: 'AKVPS1234A' },
    { id: 'seed-cust-02', code: 'CUST-1002', name: 'Rajesh Verma', mobile: '9840223344', city: 'Chennai', addr: '45, T. Nagar Main Road, Chennai', gstin: '', pan: 'BKRVR5678B' },
    { id: 'seed-cust-03', code: 'CUST-1003', name: 'Anita Desai', mobile: '9840334455', city: 'Chennai', addr: '78, Besant Nagar, Chennai', gstin: '', pan: 'CKDAD9012C' },
    { id: 'seed-cust-04', code: 'CUST-1004', name: 'Kumar & Co', mobile: '9840445566', city: 'Kanchipuram', addr: '15, Raja Street, Kanchipuram', gstin: '33AAECK4567F1Z2', pan: 'AAECK4567F' },
    { id: 'seed-cust-05', code: 'CUST-1005', name: 'Neha Mehta', mobile: '9840556677', city: 'Coimbatore', addr: '22, RS Puram, Coimbatore', gstin: '', pan: 'DKMNM3456D' },
    { id: 'seed-cust-06', code: 'CUST-1006', name: 'Rahul Shah', mobile: '9840667788', city: 'Madurai', addr: '67, West Masi Street, Madurai', gstin: '', pan: 'EKSRS7890E' },
    { id: 'seed-cust-07', code: 'CUST-1007', name: 'Sneha Patel', mobile: '9840778899', city: 'Chennai', addr: '89, Kilpauk Garden, Chennai', gstin: '', pan: 'FKPSP1234F' },
    { id: 'seed-cust-08', code: 'CUST-1008', name: 'Amit Agarwal', mobile: '9840889900', city: 'Salem', addr: '34, Meyyanur Road, Salem', gstin: '33AABCA9988G1Z5', pan: 'AABCA9988G' },
    { id: 'seed-cust-09', code: 'CUST-1009', name: 'Pooja Iyer', mobile: '9840990011', city: 'Chennai', addr: '56, Mylapore, Chennai', gstin: '', pan: 'GKPIP5678H' },
    { id: 'seed-cust-10', code: 'CUST-1010', name: 'Vikram Joshi', mobile: '9840101122', city: 'Tiruchirappalli', addr: '90, Cantonment, Trichy', gstin: '', pan: 'HKJVJ9012I' },
    { id: 'seed-cust-11', code: 'CUST-1011', name: 'Sunita Rao', mobile: '9840212233', city: 'Chennai', addr: '14, Velachery Road, Chennai', gstin: '', pan: 'IKSSR3456J' },
    { id: 'seed-cust-12', code: 'CUST-1012', name: 'Meera Krishnan', mobile: '9840323344', city: 'Chennai', addr: '33, Adyar Gandhi Nagar, Chennai', gstin: '', pan: 'JKMKM7890K' },
    { id: 'seed-cust-13', code: 'CUST-1013', name: 'Karthik Sundaram', mobile: '9840434455', city: 'Chennai', addr: '71, Alwarpet, Chennai', gstin: '', pan: 'KKSSK1234L' },
    { id: 'seed-cust-14', code: 'CUST-1014', name: 'Deepa Nambiar', mobile: '9840545566', city: 'Coimbatore', addr: '18, Race Course, Coimbatore', gstin: '', pan: 'LKNDN5678M' },
    { id: 'seed-cust-15', code: 'CUST-1015', name: 'Manoj Jain', mobile: '9840656677', city: 'Chennai', addr: '9, Sowcarpet Mint St, Chennai', gstin: '33AABCM1122H1Z9', pan: 'AABCM1122H' },
    { id: 'seed-cust-16', code: 'CUST-1016', name: 'Lakshmi Narayanan', mobile: '9840767788', city: 'Vellore', addr: '25, Katpadi Road, Vellore', gstin: '', pan: 'MKNLL9012N' },
    { id: 'seed-cust-17', code: 'CUST-1017', name: 'Sanjay Kothari', mobile: '9840878899', city: 'Chennai', addr: '82, Nungambakkam High Rd, Chennai', gstin: '', pan: 'NKSSK3456O' },
    { id: 'seed-cust-18', code: 'CUST-1018', name: 'Ananya Sengupta', mobile: '9840989900', city: 'Chennai', addr: '4, Harrington Road, Chennai', gstin: '', pan: 'OKSAS7890P' },
    { id: 'seed-cust-19', code: 'CUST-1019', name: 'Divya Balaji', mobile: '9840090011', city: 'Chennai', addr: '63, Thiruvanmiyur, Chennai', gstin: '', pan: 'PKDBD1234Q' },
    { id: 'seed-cust-20', code: 'CUST-1020', name: 'Ranganathan Chettiar', mobile: '9840191122', city: 'Karaikudi', addr: '11, Palace Road, Karaikudi', gstin: '', pan: 'QKRCR5678R' }
  ]

  for (const c of customersSeedData) {
    const accountId = `acc-${c.id}`
    // Ensure account
    db.prepare(
      `INSERT INTO accounts (
        id, account_name, other_name, account_type, account_group_id,
        mobile_number, address, city, state, gst_no, pan_no,
        opening_gold_fine, opening_silver_fine, opening_cash, opening_anamat, opening_bank,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, 'Retail Customer', ?, ?, ?, ?, 'Tamil Nadu', ?, ?, 0, 0, 0, 0, 0, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        account_name = excluded.account_name,
        mobile_number = excluded.mobile_number,
        city = excluded.city,
        updated_at = excluded.updated_at`
    ).run(accountId, c.name, c.name, debtorsGroupId, c.mobile, c.addr, c.city, c.gstin, c.pan, now, now)

    // Ensure customer
    db.prepare(
      `INSERT INTO customers (
        id, customer_code, account_id, name, display_name, mobile, address, city, state,
        gstin, pan, preferred_metal, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Tamil Nadu', ?, ?, 'Gold', 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        customer_code = excluded.customer_code,
        name = excluded.name,
        mobile = excluded.mobile,
        city = excluded.city,
        updated_at = excluded.updated_at`
    ).run(c.id, c.code, accountId, c.name, c.name, c.mobile, c.addr, c.city, c.gstin, c.pan, now, now)
  }

  // ==========================================================================
  // 6. SUPPLIERS & LINKED ACCOUNTS (10 Realistic Suppliers)
  // ==========================================================================
  console.log('Seeding Suppliers & Accounts...')
  const suppliersSeedData = [
    { id: 'seed-supp-01', code: 'SUPP-1001', name: 'Rajesh Gold Works', mobile: '9840123456', city: 'Chennai', addr: '10, NSC Bose Road, Sowcarpet, Chennai', gstin: '33AABCR1234F1Z1', pan: 'AABCR1234F' },
    { id: 'seed-supp-02', code: 'SUPP-1002', name: 'Shree Bullion Traders', mobile: '9820123456', city: 'Mumbai', addr: '112, Zaveri Bazaar, Mumbai', gstin: '27AABCS5678G1Z2', pan: 'AABCS5678G' },
    { id: 'seed-supp-03', code: 'SUPP-1003', name: 'Mehta Jewellery Manufacturing', mobile: '9825123456', city: 'Rajkot', addr: '44, Soni Bazaar, Rajkot', gstin: '24AABCM9012H1Z3', pan: 'AABCM9012H' },
    { id: 'seed-supp-04', code: 'SUPP-1004', name: 'Agarwal Gold Suppliers', mobile: '9840234567', city: 'Chennai', addr: '88, Mint Street, Chennai', gstin: '33AABCA3456I1Z4', pan: 'AABCA3456I' },
    { id: 'seed-supp-05', code: 'SUPP-1005', name: 'Kumar Diamond House', mobile: '9826123456', city: 'Surat', addr: '201, Diamond World, Varachha, Surat', gstin: '24AABCK7890J1Z5', pan: 'AABCK7890J' },
    { id: 'seed-supp-06', code: 'SUPP-1006', name: 'Chennai Gold Traders', mobile: '9840345678', city: 'Chennai', addr: '55, George Town, Chennai', gstin: '33AABCC1234K1Z6', pan: 'AABCC1234K' },
    { id: 'seed-supp-07', code: 'SUPP-1007', name: 'Royal Gems & Jewels', mobile: '9829123456', city: 'Jaipur', addr: '12, Johari Bazaar, Jaipur', gstin: '08AABCR5678L1Z7', pan: 'AABCR5678L' },
    { id: 'seed-supp-08', code: 'SUPP-1008', name: 'Swarna Craft Karigars', mobile: '9846123456', city: 'Thrissur', addr: '75, High Road, Thrissur', gstin: '32AABCS9012M1Z8', pan: 'AABCS9012M' },
    { id: 'seed-supp-09', code: 'SUPP-1009', name: 'Kothari Bullion Mart', mobile: '9842123456', city: 'Coimbatore', addr: '31, Big Bazaar Street, Coimbatore', gstin: '33AABCK3456N1Z9', pan: 'AABCK3456N' },
    { id: 'seed-supp-10', code: 'SUPP-1010', name: 'Sri Balaji Chains & Bangles', mobile: '9845123456', city: 'Bengaluru', addr: '98, Avenue Road, Bengaluru', gstin: '29AABCS7890O1Z0', pan: 'AABCS7890O' }
  ]

  for (const s of suppliersSeedData) {
    const accountId = `acc-${s.id}`
    // Ensure supplier account
    db.prepare(
      `INSERT INTO accounts (
        id, account_name, other_name, account_type, account_group_id,
        mobile_number, address, city, state, gst_no, pan_no,
        opening_gold_fine, opening_silver_fine, opening_cash, opening_anamat, opening_bank,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, 'Supplier / Karagir / Dhadi', ?, ?, ?, ?, 'Tamil Nadu', ?, ?, 0, 0, 0, 0, 0, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        account_name = excluded.account_name,
        mobile_number = excluded.mobile_number,
        city = excluded.city,
        updated_at = excluded.updated_at`
    ).run(accountId, s.name, s.name, creditorsGroupId, s.mobile, s.addr, s.city, s.gstin, s.pan, now, now)

    // Ensure supplier
    db.prepare(
      `INSERT INTO suppliers (
        id, supplier_code, account_id, name, display_name, supplier_type, mobile, address, city, state,
        gstin, pan, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'Supplier', ?, ?, ?, 'Tamil Nadu', ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        supplier_code = excluded.supplier_code,
        name = excluded.name,
        mobile = excluded.mobile,
        city = excluded.city,
        updated_at = excluded.updated_at`
    ).run(s.id, s.code, accountId, s.name, s.name, s.mobile, s.addr, s.city, s.gstin, s.pan, now, now)
  }

  // ==========================================================================
  // 7. ARTISANS / KARIGARS (4 Master Karigars)
  // ==========================================================================
  console.log('Seeding Master Karigars...')
  const karigarsSeedData = [
    { id: 'seed-krg-01', code: 'KRG-2001', name: 'Murugan Artisan', mobile: '9840811111', spec: 'Temple & Antique Jewellery' },
    { id: 'seed-krg-02', code: 'KRG-2002', name: 'Ramesh Baburao', mobile: '9840822222', spec: 'Diamond & Precious Stone Setting' },
    { id: 'seed-krg-03', code: 'KRG-2003', name: 'Selvam Karigar', mobile: '9840833333', spec: 'Handmade Chains & Bangles' },
    { id: 'seed-krg-04', code: 'KRG-2004', name: 'Prakash Soni', mobile: '9840844444', spec: 'Filigree & Silver Ornaments' }
  ]

  for (const k of karigarsSeedData) {
    db.prepare(
      `INSERT INTO karigars (
        id, karigar_code, name, mobile, specialization, fine_gold_balance, fine_silver_balance, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        mobile = excluded.mobile,
        specialization = excluded.specialization,
        updated_at = excluded.updated_at`
    ).run(k.id, k.code, k.name, k.mobile, k.spec, now, now)
  }

  // ==========================================================================
  // 8. STOCK LEDGER OPENING INVENTORY (Healthy Positive Showroom Stock)
  // ==========================================================================
  console.log('Populating Stock Ledger Opening Balances...')
  const openingStockQuantities: Record<string, { pcs: number; gross: number; fine: number }> = {
    'item-22k-ring': { pcs: 140, gross: 490.0, fine: 448.84 },
    'item-22k-bangle': { pcs: 65, gross: 1592.5, fine: 1458.73 },
    'item-22k-chain': { pcs: 80, gross: 1160.0, fine: 1062.56 },
    'item-22k-bridal-neck': { pcs: 25, gross: 1205.0, fine: 1103.78 },
    'item-22k-temple-choker': { pcs: 30, gross: 1158.0, fine: 1060.728 },
    'item-22k-jhumka': { pcs: 90, gross: 882.0, fine: 807.912 },
    'item-22k-studs': { pcs: 110, gross: 462.0, fine: 423.192 },
    'item-22k-pendant': { pcs: 85, gross: 544.0, fine: 498.304 },
    'item-22k-bracelet': { pcs: 45, gross: 990.0, fine: 906.84 },
    'item-22k-mangalsutra': { pcs: 40, gross: 740.0, fine: 677.84 },
    'item-22k-nosepin': { pcs: 120, gross: 102.0, fine: 93.432 },
    'item-24k-coin': { pcs: 75, gross: 600.0, fine: 599.4 },
    'item-18k-dia-ring': { pcs: 55, gross: 226.6, fine: 169.95 },
    'item-18k-dia-pendant': { pcs: 45, gross: 146.25, fine: 109.68 },
    'item-18k-dia-bracelet': { pcs: 25, gross: 320.0, fine: 240.0 },
    'item-925-slv-bracelet': { pcs: 120, gross: 2250.0, fine: 2081.25 },
    'item-925-slv-payal': { pcs: 80, gross: 3080.0, fine: 2849.0 }
  }

  for (const [itemId, q] of Object.entries(openingStockQuantities)) {
    const existingMovement = db
      .prepare(`SELECT id FROM stock_ledger WHERE source_type = 'OPENING_STOCK' AND item_id = ?`)
      .get(itemId)

    if (!existingMovement) {
      const itemMaster = itemsSeedData.find((i) => i.id === itemId)
      inventoryMovementService.postMovement({
        sourceType: 'OPENING_STOCK',
        sourceId: `seed-op-${itemId}`,
        movementType: 'OPENING_STOCK',
        locationId: 'loc-showroom',
        entryDate: today,
        itemId,
        stampId: itemMaster?.stamp,
        designId: itemMaster?.design,
        metalType: itemMaster?.metal || 'Gold',
        pcsDelta: q.pcs,
        grossWeightDelta: q.gross,
        netWeightDelta: q.gross,
        fineDelta: q.fine,
        narration: 'Baseline showroom opening stock balance'
      })
    }
  }

  // Ensure every item in the items table has healthy positive inventory in stock_ledger
  const allItems = db.prepare(`SELECT id, item_name, metal_type, default_stamp_id, default_design_id FROM items WHERE deleted_at IS NULL`).all() as any[]
  for (const itm of allItems) {
    const bal = db.prepare(
      `SELECT COALESCE(SUM(pcs_delta), 0) as pcs, COALESCE(SUM(gross_weight_delta), 0) as gw FROM stock_ledger WHERE item_id = ?`
    ).get(itm.id) as any
    if (bal.pcs <= 0 || bal.gw <= 0) {
      const topUpPcs = Math.max(15, Math.abs(bal.pcs) + 15)
      const topUpGross = Math.max(50.0, Math.abs(bal.gw) + 50.0)
      const topUpFine = roundNumber(topUpGross * 0.916, 3)
      const adjId = `sl-open-adj-${itm.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`
      const existingAdj = db.prepare(`SELECT id FROM stock_ledger WHERE id = ?`).get(adjId)
      if (!existingAdj) {
        db.prepare(
          `INSERT INTO stock_ledger (
            id, source_type, source_id, entry_date, item_id,
            stamp_id, design_id, metal_type,
            pcs_delta, gross_weight_delta, net_weight_delta, fine_delta,
            location_id, movement_type, narration, created_at
          ) VALUES (?, 'OPENING_STOCK', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'loc-showroom', 'OPENING_STOCK', 'Baseline positive opening balance', ?)`
        ).run(adjId, adjId, today, itm.id, itm.default_stamp_id || null, itm.default_design_id || null, itm.metal_type || 'Gold', topUpPcs, topUpGross, topUpGross, topUpFine, now)
      } else {
        db.prepare(
          `UPDATE stock_ledger SET pcs_delta = pcs_delta + ?, gross_weight_delta = gross_weight_delta + ?, net_weight_delta = net_weight_delta + ?, fine_delta = fine_delta + ? WHERE id = ?`
        ).run(topUpPcs, topUpGross, topUpGross, topUpFine, adjId)
      }
    }
  }

  // ==========================================================================
  // 9. SERIALIZED PHYSICAL STOCK (110 Barcoded Jewellery Pieces)
  // ==========================================================================
  console.log('Seeding Serialized Jewellery Physical Stock...')
  const insertStockItemStmt = db.prepare(
    `INSERT INTO jewellery_stock_items (
      id, stock_item_code, item_id, barcode, qr_code, rfid_epc, serial_number,
      gross_weight, net_weight, fine_weight, purity_name, tunch,
      status, location, counter, tray, tag_status, last_scanned_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      location = excluded.location,
      counter = excluded.counter,
      tray = excluded.tray,
      updated_at = excluded.updated_at`
  )

  let barcodeSeq = 1001
  const stockCounters = ['Gold Counter 1', 'Gold Counter 2', 'Bridal Lounge', 'Silver Section', 'Diamond Lounge']
  const stockTrays = ['Tray A1', 'Tray A2', 'Tray B1', 'Tray B2', 'Tray C1', 'Showcase Display']

  for (let i = 0; i < itemsSeedData.length; i++) {
    const item = itemsSeedData[i]
    // Seed 6 pieces per item master (~102 pieces total)
    for (let p = 1; p <= 6; p++) {
      const stockId = `seed-stk-${item.id}-${p}`
      const barcode = `JWL2026${barcodeSeq}`
      const qrCode = `QR-STK-2026-${barcodeSeq}`
      const rfidEpc = `E28011${barcodeSeq}00001`
      const serialNumber = `SN-2026-${barcodeSeq}`

      // Slight natural variance in weight
      const weightDelta = (p - 3) * 0.05
      const gross = roundNumber(item.wt + weightDelta, 3)
      const net = gross
      const fine = roundNumber((net * item.tanch) / 100, 3)

      const counter = stockCounters[(i + p) % stockCounters.length]
      const tray = stockTrays[(i * 2 + p) % stockTrays.length]

      // Pieces 1-4 IN_STOCK, Piece 5 CONSIGNMENT, Piece 6 SOLD
      const status = p === 5 ? 'CONSIGNMENT' : p === 6 ? 'SOLD' : 'IN_STOCK'

      insertStockItemStmt.run(
        stockId,
        `STK-2026-${barcodeSeq}`,
        item.id,
        barcode,
        qrCode,
        rfidEpc,
        serialNumber,
        gross,
        net,
        fine,
        item.stamp === stamp916Id ? '22K' : item.stamp === stamp750Id ? '18K' : 'Silver 925',
        item.tanch,
        status,
        'loc-showroom',
        counter,
        tray,
        now,
        now,
        now
      )

      barcodeSeq++
    }
  }

  // ==========================================================================
  // 10. PURCHASE INVOICES (10 Inward Invoices via purchaseInvoiceService)
  // ==========================================================================
  console.log('Seeding Purchase Inwards...')
  const purchaseSeedPlans = [
    { num: 'PUR-2026-0181', suppIdx: 0, daysAgo: 14, itemId: 'item-22k-bangle', pcs: 2, wt: 49.0, rate: 6800, paidPart: 1.0 },
    { num: 'PUR-2026-0182', suppIdx: 1, daysAgo: 12, itemId: 'item-24k-coin', pcs: 5, wt: 40.0, rate: 7420, paidPart: 0.5 },
    { num: 'PUR-2026-0183', suppIdx: 2, daysAgo: 10, itemId: 'item-22k-bridal-neck', pcs: 1, wt: 48.2, rate: 6810, paidPart: 0.0 }, // Full payable
    { num: 'PUR-2026-0184', suppIdx: 3, daysAgo: 8, itemId: 'item-22k-chain', pcs: 3, wt: 43.5, rate: 6820, paidPart: 0.6 },
    { num: 'PUR-2026-0185', suppIdx: 4, daysAgo: 6, itemId: 'item-18k-dia-ring', pcs: 2, wt: 8.24, rate: 5560, paidPart: 0.0 }, // Diamond payable
    { num: 'PUR-2026-0186', suppIdx: 5, daysAgo: 3, itemId: 'item-22k-jhumka', pcs: 4, wt: 39.2, rate: 6830, paidPart: 0.7 },
    { num: 'PUR-2026-0187', suppIdx: 0, daysAgo: 0, itemId: 'item-22k-ring', pcs: 3, wt: 10.5, rate: 6860, paidPart: 1.0 }, // TODAY'S PURCHASE 1
    { num: 'PUR-2026-0188', suppIdx: 7, daysAgo: 0, itemId: 'item-22k-temple-choker', pcs: 1, wt: 38.6, rate: 6860, paidPart: 0.4 }, // TODAY'S PURCHASE 2
    { num: 'PUR-2026-0189', suppIdx: 8, daysAgo: 1, itemId: 'item-925-slv-bracelet', pcs: 5, wt: 93.75, rate: 82.0, paidPart: 0.5 },
    { num: 'PUR-2026-0190', suppIdx: 9, daysAgo: 2, itemId: 'item-22k-studs', pcs: 4, wt: 16.8, rate: 6840, paidPart: 0.0 }
  ]

  for (const plan of purchaseSeedPlans) {
    const existing = db.prepare(`SELECT id FROM purchase_invoices WHERE invoice_number = ?`).get(plan.num)
    if (!existing) {
      const invDate = dayjs().subtract(plan.daysAgo, 'day').format('YYYY-MM-DD')
      const supp = suppliersSeedData[plan.suppIdx]
      const approxTotal = roundNumber(plan.wt * plan.rate * 1.03, 2)
      const payAmt = roundNumber(approxTotal * plan.paidPart, 2)

      try {
        purchaseInvoiceService.create({
          supplierId: supp.id,
          accountId: `acc-${supp.id}`,
          supplierInvoiceNumber: `SUP-INV-${plan.num.slice(4)}`,
          invoiceDate: invDate,
          metalType: plan.itemId.includes('slv') ? 'Silver' : 'Gold',
          notes: `Showroom Stock Inward from ${supp.name}`,
          items: [
            {
              itemId: plan.itemId,
              pcs: plan.pcs,
              grossWeight: plan.wt,
              goldRate: plan.rate,
              taxPercent: 3
            }
          ],
          payments:
            payAmt > 0
              ? [
                  {
                    paymentMethod: 'BANK',
                    amount: payAmt,
                    paymentReference: `NEFT-${plan.num.slice(4)}`,
                    notes: 'Advance/Part payment against inward'
                  }
                ]
              : []
        })
      } catch (err: any) {
        console.warn(`Note on purchase invoice ${plan.num}: ${err.message}`)
      }
    }
  }

  // ==========================================================================
  // 11. SALES INVOICES (22 Invoices via salesInvoiceService)
  // ==========================================================================
  console.log('Seeding Sales Invoices & Cash Movements...')
  const salesSeedPlans = [
    // --- TODAY'S SALES (Multiple transactions totaling ~₹5,50,000) ---
    { num: 'INV-2026-0521', custIdx: 0, daysAgo: 0, itemId: 'item-22k-ring', pcs: 1, wt: 3.5, rate: 6860, method: 'CASH', partPay: 1.0 }, // Priya Sharma: ~₹25K Cash
    { num: 'INV-2026-0522', custIdx: 1, daysAgo: 0, itemId: 'item-22k-bangle', pcs: 1, wt: 24.5, rate: 6860, method: 'CARD', partPay: 1.0 }, // Rajesh Verma: ~₹1.8L Card
    { num: 'INV-2026-0523', custIdx: 2, daysAgo: 0, itemId: 'item-22k-chain', pcs: 1, wt: 14.5, rate: 6860, method: 'UPI', partPay: 1.0 }, // Anita Desai: ~₹1.1L UPI
    { num: 'INV-2026-0524', custIdx: 3, daysAgo: 0, itemId: 'item-22k-temple-choker', pcs: 1, wt: 38.6, rate: 6860, method: 'BANK', partPay: 0.5 }, // Kumar & Co: ~₹2.9L (Half paid, half credit)
    { num: 'INV-2026-0525', custIdx: 4, daysAgo: 0, itemId: 'item-925-slv-bracelet', pcs: 2, wt: 37.5, rate: 82, method: 'UPI', partPay: 1.0 }, // Neha Mehta: ~₹3.5K

    // --- PAST SALES (Creating Customer Receivables ~₹7,50,000) ---
    { num: 'INV-2026-0501', custIdx: 5, daysAgo: 24, itemId: 'item-22k-bridal-neck', pcs: 1, wt: 48.2, rate: 6800, method: 'BANK', partPay: 0.5 }, // Rahul Shah: ~₹1.7L Due
    { num: 'INV-2026-0502', custIdx: 6, daysAgo: 22, itemId: 'item-18k-dia-ring', pcs: 1, wt: 4.12, rate: 5580, method: 'CARD', partPay: 1.0 },
    { num: 'INV-2026-0503', custIdx: 7, daysAgo: 20, itemId: 'item-22k-bangle', pcs: 2, wt: 49.0, rate: 6810, method: 'BANK', partPay: 0.4 }, // Amit Agarwal: ~₹2.1L Due
    { num: 'INV-2026-0504', custIdx: 8, daysAgo: 18, itemId: 'item-22k-jhumka', pcs: 1, wt: 9.8, rate: 6820, method: 'UPI', partPay: 1.0 },
    { num: 'INV-2026-0505', custIdx: 9, daysAgo: 16, itemId: 'item-22k-temple-choker', pcs: 1, wt: 38.6, rate: 6820, method: 'CASH', partPay: 0.6 }, // Vikram Joshi: ~₹1.2L Due
    { num: 'INV-2026-0506', custIdx: 10, daysAgo: 15, itemId: 'item-22k-mangalsutra', pcs: 1, wt: 18.5, rate: 6830, method: 'CARD', partPay: 1.0 },
    { num: 'INV-2026-0507', custIdx: 11, daysAgo: 14, itemId: 'item-24k-coin', pcs: 1, wt: 8.0, rate: 7450, method: 'UPI', partPay: 1.0 },
    { num: 'INV-2026-0508', custIdx: 12, daysAgo: 12, itemId: 'item-22k-chain', pcs: 2, wt: 29.0, rate: 6830, method: 'BANK', partPay: 0.5 }, // Karthik Sundaram: ~₹1.0L Due
    { num: 'INV-2026-0509', custIdx: 13, daysAgo: 10, itemId: 'item-18k-dia-bracelet', pcs: 1, wt: 12.8, rate: 5600, method: 'CARD', partPay: 1.0 },
    { num: 'INV-2026-0510', custIdx: 14, daysAgo: 9, itemId: 'item-22k-bangle', pcs: 1, wt: 24.5, rate: 6840, method: 'BANK', partPay: 0.0 }, // Manoj Jain: ~₹1.8L Due (Full Credit)
    { num: 'INV-2026-0511', custIdx: 15, daysAgo: 7, itemId: 'item-22k-pendant', pcs: 1, wt: 6.4, rate: 6840, method: 'UPI', partPay: 1.0 },
    { num: 'INV-2026-0512', custIdx: 16, daysAgo: 5, itemId: 'item-22k-studs', pcs: 2, wt: 8.4, rate: 6850, method: 'CASH', partPay: 1.0 },
    { num: 'INV-2026-0513', custIdx: 17, daysAgo: 4, itemId: 'item-925-slv-payal', pcs: 2, wt: 77.0, rate: 82.0, method: 'UPI', partPay: 1.0 },
    { num: 'INV-2026-0514', custIdx: 18, daysAgo: 3, itemId: 'item-22k-ring', pcs: 2, wt: 7.0, rate: 6850, method: 'CARD', partPay: 1.0 },
    { num: 'INV-2026-0515', custIdx: 19, daysAgo: 2, itemId: 'item-22k-bridal-neck', pcs: 1, wt: 48.2, rate: 6860, method: 'BANK', partPay: 0.6 }, // Ranganathan Chettiar: ~₹1.4L Due
    { num: 'INV-2026-0516', custIdx: 0, daysAgo: 1, itemId: 'item-22k-nosepin', pcs: 2, wt: 1.7, rate: 6860, method: 'CASH', partPay: 1.0 },
    { num: 'INV-2026-0517', custIdx: 2, daysAgo: 1, itemId: 'item-18k-dia-pendant', pcs: 1, wt: 3.25, rate: 5610, method: 'UPI', partPay: 1.0 }
  ]

  for (const plan of salesSeedPlans) {
    const existing = db.prepare(`SELECT id FROM sales_invoices WHERE invoice_number = ?`).get(plan.num)
    if (!existing) {
      const invDate = dayjs().subtract(plan.daysAgo, 'day').format('YYYY-MM-DD')
      const cust = customersSeedData[plan.custIdx]
      const approxTotal = roundNumber(plan.wt * plan.rate * 1.03, 2)
      const payAmt = roundNumber(approxTotal * plan.partPay, 2)

      try {
        salesInvoiceService.createInvoice({
          invoiceNumber: plan.num,
          customerId: cust.id,
          accountId: `acc-${cust.id}`,
          invoiceDate: invDate,
          metalType: plan.itemId.includes('slv') ? 'Silver' : 'Gold',
          notes: `Counter POS Sale to ${cust.name}`,
          items: [
            {
              itemId: plan.itemId,
              pcs: plan.pcs,
              grossWeight: plan.wt,
              goldRate: plan.rate,
              taxPercent: 3
            }
          ],
          payments:
            payAmt > 0
              ? [
                  {
                    paymentMethod: plan.method as any,
                    amount: payAmt,
                    paymentReference: `${plan.method}-${plan.num.slice(4)}`,
                    notes: 'Payment received at billing'
                  }
                ]
              : []
        })
      } catch (err: any) {
        console.warn(`Note on sales invoice ${plan.num}: ${err.message}`)
      }
    }
  }

  // ==========================================================================
  // 12. CUSTOMER ORDERS (10 Orders via customerOrderService)
  // ==========================================================================
  console.log('Seeding Customer Orders...')
  const ordersSeedData = [
    { num: 'ORD-2026-0040', custIdx: 3, status: 'READY', daysDue: -1, wt: 35.0, item: 'item-22k-temple-choker' }, // Ready for delivery
    { num: 'ORD-2026-0041', custIdx: 0, status: 'IN_PROGRESS', daysDue: 3, wt: 22.0, item: 'item-22k-bangle' },
    { num: 'ORD-2026-0042', custIdx: 0, status: 'IN_PROGRESS', daysDue: -2, wt: 24.5, item: 'item-22k-bangle' }, // DELAYED ORDER (Attention Alert)
    { num: 'ORD-2026-0043', custIdx: 2, status: 'CONFIRMED', daysDue: 7, wt: 48.2, item: 'item-22k-bridal-neck' },
    { num: 'ORD-2026-0044', custIdx: 4, status: 'CONFIRMED', daysDue: 10, wt: 14.5, item: 'item-22k-chain' },
    { num: 'ORD-2026-0045', custIdx: 6, status: 'READY', daysDue: 0, wt: 4.12, item: 'item-18k-dia-ring' },
    { num: 'ORD-2026-0046', custIdx: 8, status: 'IN_PROGRESS', daysDue: 4, wt: 9.8, item: 'item-22k-jhumka' },
    { num: 'ORD-2026-0047', custIdx: 10, status: 'COMPLETED', daysDue: -5, wt: 18.5, item: 'item-22k-mangalsutra' },
    { num: 'ORD-2026-0048', custIdx: 12, status: 'CONFIRMED', daysDue: 12, wt: 22.0, item: 'item-22k-bracelet' },
    { num: 'ORD-2026-0049', custIdx: 14, status: 'COMPLETED', daysDue: -8, wt: 38.5, item: 'item-925-slv-payal' }
  ]

  for (const o of ordersSeedData) {
    const existing = db.prepare(`SELECT id FROM customer_orders WHERE order_number = ?`).get(o.num)
    if (!existing) {
      const cust = customersSeedData[o.custIdx]
      const expDate = dayjs().add(o.daysDue, 'day').format('YYYY-MM-DD')
      try {
        customerOrderService.create({
          orderNumber: o.num,
          customerId: cust.id,
          accountId: `acc-${cust.id}`,
          orderDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
          expectedDeliveryDate: expDate,
          status: o.status as any,
          advanceAmount: 25000,
          notes: `Custom showroom order for ${cust.name}`,
          items: [
            {
              itemId: o.item,
              pcs: 1,
              grossWeight: o.wt,
              goldRate: 6860,
              taxPercent: 3
            }
          ]
        })
      } catch (err: any) {
        console.warn(`Note on order ${o.num}: ${err.message}`)
      }
    }
  }

  // ==========================================================================
  // 13. QUOTATIONS (8 Quotations via quotationService)
  // ==========================================================================
  console.log('Seeding Customer Quotations...')
  const quotationSeedData = [
    { num: 'QTN-2026-0058', custIdx: 4, status: 'EXPIRED', daysValid: -1, wt: 6.4, item: 'item-22k-pendant' }, // Expired yesterday
    { num: 'QTN-2026-0059', custIdx: 6, status: 'DRAFT', daysValid: 7, wt: 4.12, item: 'item-18k-dia-ring' },
    { num: 'QTN-2026-0060', custIdx: 7, status: 'SENT', daysValid: 5, wt: 24.5, item: 'item-22k-bangle' },
    { num: 'QTN-2026-0061', custIdx: 1, status: 'SENT', daysValid: 0, wt: 12.8, item: 'item-18k-dia-bracelet' }, // Pending decision
    { num: 'QTN-2026-0062', custIdx: 2, status: 'ACCEPTED', daysValid: 3, wt: 48.2, item: 'item-22k-bridal-neck' },
    { num: 'QTN-2026-0063', custIdx: 9, status: 'DRAFT', daysValid: 14, wt: 14.5, item: 'item-22k-chain' },
    { num: 'QTN-2026-0064', custIdx: 11, status: 'SENT', daysValid: 4, wt: 38.6, item: 'item-22k-temple-choker' },
    { num: 'QTN-2026-0065', custIdx: 13, status: 'ACCEPTED', daysValid: 2, wt: 9.8, item: 'item-22k-jhumka' }
  ]

  for (const q of quotationSeedData) {
    const existing = db.prepare(`SELECT id FROM quotations WHERE quotation_number = ?`).get(q.num)
    if (!existing) {
      const cust = customersSeedData[q.custIdx]
      const validUntil = dayjs().add(q.daysValid, 'day').format('YYYY-MM-DD')
      try {
        quotationService.create({
          quotationNumber: q.num,
          customerId: cust.id,
          accountId: `acc-${cust.id}`,
          quotationDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
          validUntil,
          status: q.status as any,
          notes: `Jewellery estimate provided for ${cust.name}`,
          items: [
            {
              itemId: q.item,
              pcs: 1,
              grossWeight: q.wt,
              goldRate: 6860,
              taxPercent: 3
            }
          ]
        })
      } catch (err: any) {
        console.warn(`Note on quotation ${q.num}: ${err.message}`)
      }
    }
  }

  // ==========================================================================
  // 14. CUSTOMER ADVANCES (6 Advances via advanceService)
  // ==========================================================================
  console.log('Seeding Customer Advances...')
  const advanceSeedData = [
    { num: 'ADV-2026-0031', custIdx: 0, amt: 50000, method: 'UPI', daysAgo: 5, notes: 'Advance for wedding bangles' },
    { num: 'ADV-2026-0032', custIdx: 1, amt: 25000, method: 'CASH', daysAgo: 3, notes: 'Advance for gold coin booking' },
    { num: 'ADV-2026-0033', custIdx: 3, amt: 75000, method: 'BANK', daysAgo: 2, notes: 'Advance for temple jewellery set' },
    { num: 'ADV-2026-0034', custIdx: 2, amt: 100000, method: 'UPI', daysAgo: 0, notes: 'Advance for custom bridal necklace' }, // TODAY'S ADVANCE
    { num: 'ADV-2026-0035', custIdx: 5, amt: 150000, method: 'BANK', daysAgo: 1, notes: 'Advance for gold chain & bracelet' },
    { num: 'ADV-2026-0036', custIdx: 7, amt: 50000, method: 'CASH', daysAgo: 0, notes: 'Cash booking advance' }
  ]

  for (const a of advanceSeedData) {
    const existing = db.prepare(`SELECT id FROM customer_advances WHERE advance_number = ?`).get(a.num)
    if (!existing) {
      const cust = customersSeedData[a.custIdx]
      const advDate = dayjs().subtract(a.daysAgo, 'day').format('YYYY-MM-DD')
      try {
        advanceService.receiveAdvance({
          advanceNumber: a.num,
          customerId: cust.id,
          accountId: `acc-${cust.id}`,
          amount: a.amt,
          paymentMethod: a.method as any,
          paymentReference: `${a.method}-${a.num.slice(4)}`,
          advanceDate: advDate,
          notes: a.notes
        })
      } catch (err: any) {
        console.warn(`Note on advance ${a.num}: ${err.message}`)
      }
    }
  }

  // ==========================================================================
  // 15. CONSIGNMENT / MEMO INWARDS (6 Inwards & Settlements)
  // ==========================================================================
  console.log('Seeding Vendor Consignment & Approval Memos...')
  const consignmentSeedData = [
    { num: 'CONS-2026-0004', suppIdx: 4, daysAgo: 20, expDays: 10, status: 'COMPLETED', cost: 180000, settled: 180000 },
    { num: 'CONS-2026-0005', suppIdx: 6, daysAgo: 15, expDays: 5, status: 'PARTIALLY_SETTLED', cost: 240000, settled: 120000 },
    { num: 'CONS-2026-0006', suppIdx: 7, daysAgo: 10, expDays: 8, status: 'ACTIVE', cost: 150000, settled: 0 },
    { num: 'CONS-2026-0007', suppIdx: 2, daysAgo: 7, expDays: 7, status: 'ACTIVE', cost: 320000, settled: 0 },
    { num: 'CONS-2026-0008', suppIdx: 0, daysAgo: 12, expDays: -3, status: 'ACTIVE', cost: 210000, settled: 0 }, // OVERDUE RETURN (Attention Alert)
    { num: 'CONS-2026-0009', suppIdx: 8, daysAgo: 0, expDays: 14, status: 'ACTIVE', cost: 95000, settled: 0 } // TODAY'S MEMO
  ]

  for (const c of consignmentSeedData) {
    const existing = db.prepare(`SELECT id FROM consignment_inwards WHERE consignment_number = ?`).get(c.num) as any
    const supp = suppliersSeedData[c.suppIdx]
    const inDate = dayjs().subtract(c.daysAgo, 'day').format('YYYY-MM-DD')
    const expReturn = dayjs().add(c.expDays, 'day').format('YYYY-MM-DD')

    let inwardId = existing?.id
    if (!inwardId) {
      inwardId = `seed-ci-${c.num}`
      db.prepare(
        `INSERT INTO consignment_inwards (
          id, consignment_number, supplier_id, inward_date, expected_return_date,
          status, settlement_status, total_pieces, total_gross_weight, total_vendor_cost,
          total_settled_amount, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 6, 85.5, ?, ?, ?, 'Admin', ?, ?)`
      ).run(
        inwardId,
        c.num,
        supp.id,
        inDate,
        expReturn,
        c.status,
        c.settled >= c.cost ? 'SETTLED' : c.settled > 0 ? 'PARTIALLY_SETTLED' : 'UNSETTLED',
        c.cost,
        c.settled,
        `Vendor memo consignment from ${supp.name}`,
        now,
        now
      )

      // Insert 6 consignment items per inward
      const stockPieceForCons = db
        .prepare(`SELECT id, gross_weight, net_weight, fine_weight FROM jewellery_stock_items WHERE status = 'CONSIGNMENT' LIMIT 6`)
        .all() as any[]

      for (let ci = 0; ci < 6; ci++) {
        const citemId = `citem-${inwardId}-${ci}`
        const piece = stockPieceForCons[ci] || { id: `seed-stk-item-22k-ring-${ci + 1}`, gross_weight: 12.5, net_weight: 12.5, fine_weight: 11.45 }
        const itemStatus = ci === 0 ? 'SOLD' : ci === 1 ? 'RETURNED' : 'IN_SHOWROOM'

        db.prepare(
          `INSERT INTO consignment_items (
            id, consignment_inward_id, supplier_id, stock_item_id, item_id,
            vendor_item_code, gross_weight, net_weight, fine_weight, purity_name,
            tunch, vendor_cost, retail_price, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'item-22k-bangle', ?, ?, ?, ?, '22K', 91.6, ?, ?, ?, ?, ?)`
        ).run(
          citemId,
          inwardId,
          supp.id,
          piece.id,
          `VEND-${c.num.slice(5)}-${ci + 1}`,
          piece.gross_weight,
          piece.net_weight,
          piece.fine_weight,
          roundNumber(c.cost / 6, 2),
          roundNumber((c.cost / 6) * 1.25, 2),
          itemStatus,
          now,
          now
        )
      }

      // If settled, record settlement
      if (c.settled > 0) {
        db.prepare(
          `INSERT INTO consignment_settlements (
            id, settlement_number, supplier_id, consignment_inward_id,
            settlement_date, settled_amount, payment_method, payment_reference,
            notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'BANK', ?, 'Settlement payout', 'Admin', ?)`
        ).run(
          `cset-${inwardId}`,
          `SET-${c.num.slice(5)}`,
          supp.id,
          inwardId,
          today,
          c.settled,
          `NEFT-SET-${c.num.slice(5)}`,
          now
        )
      }
    }
  }

  // ==========================================================================
  // 16. REPAIR JOBS (6 Jobs across Karigars & Customers)
  // ==========================================================================
  console.log('Seeding Repair Jobs...')
  const repairSeedData = [
    { num: 'REP-2026-0015', custIdx: 0, krgIdx: 0, type: 'Resizing', status: 'DELIVERED', daysAgo: 5, est: 1200 },
    { num: 'REP-2026-0016', custIdx: 1, krgIdx: 1, type: 'Stone Replacement', status: 'IN_REPAIR', daysAgo: 2, est: 3500 },
    { num: 'REP-2026-0017', custIdx: 2, krgIdx: 2, type: 'Polishing & Cleaning', status: 'RECEIVED', daysAgo: 0, est: 800 },
    { num: 'REP-2026-0018', custIdx: 4, krgIdx: 0, type: 'Soldering & Lock Repair', status: 'READY_FOR_DELIVERY', daysAgo: 3, est: 1800 }, // READY (Attention Alert)
    { num: 'REP-2026-0019', custIdx: 6, krgIdx: 1, type: 'Rhodium Plating', status: 'READY_FOR_DELIVERY', daysAgo: 2, est: 2200 }, // READY (Attention Alert)
    { num: 'REP-2026-0020', custIdx: 8, krgIdx: 3, type: 'Antique Finish', status: 'ASSIGNED', daysAgo: 1, est: 1500 }
  ]

  for (const r of repairSeedData) {
    const existing = db.prepare(`SELECT id FROM repair_jobs WHERE repair_number = ?`).get(r.num)
    if (!existing) {
      const cust = customersSeedData[r.custIdx]
      const krg = karigarsSeedData[r.krgIdx]
      const recDate = dayjs().subtract(r.daysAgo, 'day').format('YYYY-MM-DD')
      const expDel = dayjs().add(2, 'day').format('YYYY-MM-DD')

      db.prepare(
        `INSERT INTO repair_jobs (
          id, repair_number, customer_id, ownership_type, customer_item_description,
          metal_type, purity_name, repair_type, status, priority,
          received_date, expected_delivery_date, assigned_karigar_id,
          before_gross_weight, before_net_weight, before_fine_weight,
          estimate_labour, estimate_total, is_estimate_approved,
          final_repair_charge, amount_paid, balance_due,
          qc_status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'CUSTOMER_OWNED', ?, 'GOLD', '22K', ?, ?, 'NORMAL', ?, ?, ?, 12.45, 12.45, 11.40, ?, ?, 1, ?, 0, ?, 'APPROVED', 'Admin', ?, ?)`
      ).run(
        `seed-rep-${r.num}`,
        r.num,
        cust.id,
        `22K Gold Ornament (${r.type})`,
        r.type,
        r.status,
        recDate,
        expDel,
        krg.id,
        r.est,
        r.est,
        r.est,
        r.est,
        now,
        now
      )
    }
  }

  // ==========================================================================
  // 17. MANUFACTURING ORDERS (5 Orders for Karigars)
  // ==========================================================================
  console.log('Seeding Manufacturing Orders...')
  const mfgSeedData = [
    { num: 'MO-2026-0101', krgIdx: 0, item: 'item-22k-temple-choker', pcs: 1, wt: 38.6, status: 'COMPLETED', daysDue: -4 },
    { num: 'MO-2026-0102', krgIdx: 1, item: 'item-18k-dia-bracelet', pcs: 1, wt: 12.8, status: 'IN_PROGRESS', daysDue: 5 },
    { num: 'MO-2026-0103', krgIdx: 2, item: 'item-22k-chain', pcs: 2, wt: 29.0, status: 'IN_PROGRESS', daysDue: -1 }, // DELAYED
    { num: 'MO-2026-0104', krgIdx: 0, item: 'item-22k-bridal-neck', pcs: 1, wt: 48.2, status: 'APPROVED', daysDue: 8 },
    { num: 'MO-2026-0105', krgIdx: 3, item: 'item-925-slv-payal', pcs: 3, wt: 115.5, status: 'APPROVED', daysDue: 10 }
  ]

  for (const m of mfgSeedData) {
    const existing = db.prepare(`SELECT id FROM manufacturing_orders WHERE order_number = ?`).get(m.num)
    if (!existing) {
      const krg = karigarsSeedData[m.krgIdx]
      const expDate = dayjs().add(m.daysDue, 'day').format('YYYY-MM-DD')
      db.prepare(
        `INSERT INTO manufacturing_orders (
          id, order_number, item_id, karigar_id, planned_pcs, planned_gross_weight, planned_net_weight,
          metal_type, purity_name, target_fine_weight, expected_delivery_date, status,
          total_issued_gross, total_issued_fine, total_returned_fine, total_finished_fine,
          notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'GOLD', '22K', ?, ?, ?, ?, ?, 0, 0, 'Showroom workshop order', 'Admin', ?, ?)`
      ).run(
        `seed-mo-${m.num}`,
        m.num,
        m.item,
        krg.id,
        m.pcs,
        m.wt,
        m.wt,
        roundNumber((m.wt * 91.6) / 100, 3),
        expDate,
        m.status,
        m.wt + 2.0,
        roundNumber(((m.wt + 2.0) * 91.6) / 100, 3),
        now,
        now
      )
    }
  }

  // ==========================================================================
  // 18. RETURN TRANSACTIONS (Sales & Purchase Returns)
  // ==========================================================================
  console.log('Seeding Return Transactions...')
  const returnSeedData = [
    {
      num: 'SRTN-2026-0001',
      type: 'SALES_RETURN',
      noteType: 'CREDIT_NOTE',
      invNum: 'INV-2026-0518',
      custIdx: 0,
      itemId: 'item-22k-studs',
      pcs: 1,
      wt: 4.2,
      total: 31000,
      reason: 'Customer requested size exchange'
    },
    {
      num: 'PRTN-2026-0001',
      type: 'PURCHASE_RETURN',
      noteType: 'DEBIT_NOTE',
      invNum: 'PUR-2026-0181',
      suppIdx: 0,
      itemId: 'item-22k-bangle',
      pcs: 1,
      wt: 24.5,
      total: 168000,
      reason: 'Defective clasp returned to manufacturer'
    }
  ]

  for (const ret of returnSeedData) {
    const existing = db.prepare(`SELECT id FROM return_transactions WHERE return_number = ?`).get(ret.num)
    if (!existing) {
      const isSales = ret.type === 'SALES_RETURN'
      const party = isSales
        ? customersSeedData[ret.custIdx ?? 0]
        : suppliersSeedData[ret.suppIdx ?? 0]
      const accId = `acc-${party.id}`

      db.prepare(
        `INSERT INTO return_transactions (
          id, return_number, return_type, note_type, original_invoice_number,
          customer_id, supplier_id, account_id, return_date, metal_type,
          total_pcs, gross_weight, net_weight, fine_weight,
          subtotal, taxable_amount, tax_amount, return_total, refund_amount, adjustment_amount,
          status, reason, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Gold', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'COMPLETED', ?, 'Demo return transaction', 'Admin', ?, ?)`
      ).run(
        `seed-ret-${ret.num}`,
        ret.num,
        ret.type,
        ret.noteType,
        ret.invNum,
        isSales ? party.id : null,
        !isSales ? party.id : null,
        accId,
        today,
        ret.pcs,
        ret.wt,
        ret.wt,
        roundNumber((ret.wt * 91.6) / 100, 3),
        ret.total,
        ret.total,
        roundNumber(ret.total * 0.03, 2),
        roundNumber(ret.total * 1.03, 2),
        roundNumber(ret.total * 1.03, 2),
        ret.reason,
        now,
        now
      )
    }
  }

  // ==========================================================================
  // 19. PETTY CASH & DAILY VOUCHERS (Cash In Hand Operations)
  // ==========================================================================
  console.log('Seeding Petty Cash Vouchers...')
  const ensureCashAccount = () => {
    let acc = db.prepare(`SELECT id FROM accounts WHERE account_name = 'Cash in Hand' OR account_name = 'Cash Account' LIMIT 1`).get() as any
    if (acc) return acc.id
    acc = db.prepare(`SELECT id FROM accounts WHERE account_name LIKE '%Cash%' LIMIT 1`).get() as any
    if (acc) return acc.id
    const cashGroupId = ensureAccountGroup('Cash-in-Hand', 'Assets')
    const id = 'acc-cash-in-hand'
    db.prepare(`
      INSERT INTO accounts (
        id, account_name, other_name, account_type, account_group_id,
        mobile_number, address, city, state, gst_no, pan_no,
        opening_gold_fine, opening_silver_fine, opening_cash, opening_anamat, opening_bank,
        active, created_at, updated_at
      ) VALUES (?, 'Cash in Hand', 'Cash Counter', 'Cash Account', ?, '', 'Showroom Floor', 'Chennai', 'Tamil Nadu', '', '', 0, 0, 150000, 0, 0, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
    `).run(id, cashGroupId, now, now)
    return id
  }
  const cashAccountId = ensureCashAccount()

  const vouchersSeedData = [
    { num: 'CV-2026-001', type: 'RECEIPT', amt: 25000, desc: 'Petty cash draw from central vault' },
    { num: 'CV-2026-002', type: 'PAYMENT', amt: 1850, desc: 'Showroom flowers, puja items & refreshments' },
    { num: 'CV-2026-003', type: 'PAYMENT', amt: 3200, desc: 'Courier & secure transit charges' }
  ]

  for (const v of vouchersSeedData) {
    const existing = db.prepare(`SELECT id FROM cash_vouchers WHERE voucher_no = ?`).get(v.num)
    if (!existing) {
      const vId = `seed-cv-${v.num}`
      db.prepare(
        `INSERT INTO cash_vouchers (
          id, voucher_type, voucher_no, voucher_date, account_id, amount, narration, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(vId, v.type, v.num, today, cashAccountId, v.amt, v.desc, now, now)

      // Post to account_ledger under Cash Accounts
      db.prepare(
        `INSERT INTO account_ledger (
          id, source_type, source_id, entry_date, account_id,
          cash_jama, cash_nave, bank_jama, bank_nave, narration, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
      ).run(
        `al-${vId}`,
        v.type === 'RECEIPT' ? 'CASH_RECEIPT' : 'CASH_PAYMENT',
        vId,
        today,
        cashAccountId,
        v.type === 'RECEIPT' ? v.amt : 0,
        v.type === 'PAYMENT' ? v.amt : 0,
        v.desc,
        now
      )
    }
  }

  // Final check: Guarantee strictly positive inventory for all items in stock ledger
  const allFinalItems = db.prepare(`SELECT id, metal_type, default_stamp_id, default_design_id FROM items WHERE deleted_at IS NULL`).all() as any[]
  for (const itm of allFinalItems) {
    const bal = db.prepare(
      `SELECT COALESCE(SUM(pcs_delta), 0) as pcs, COALESCE(SUM(gross_weight_delta), 0) as gw FROM stock_ledger WHERE item_id = ?`
    ).get(itm.id) as any
    if (bal.pcs <= 0 || bal.gw <= 0) {
      const topUpPcs = Math.max(15, Math.abs(bal.pcs) + 15)
      const topUpGross = Math.max(50.0, Math.abs(bal.gw) + 50.0)
      const topUpFine = roundNumber(topUpGross * 0.916, 3)
      const adjId = `sl-post-adj-${itm.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`
      const existingAdj = db.prepare(`SELECT id FROM stock_ledger WHERE id = ?`).get(adjId)
      if (!existingAdj) {
        db.prepare(
          `INSERT INTO stock_ledger (
            id, source_type, source_id, entry_date, item_id,
            stamp_id, design_id, metal_type,
            pcs_delta, gross_weight_delta, net_weight_delta, fine_delta,
            location_id, movement_type, narration, created_at
          ) VALUES (?, 'OPENING_STOCK', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'loc-showroom', 'OPENING_STOCK', 'Balancing positive showroom stock', ?)`
        ).run(adjId, adjId, today, itm.id, itm.default_stamp_id || null, itm.default_design_id || null, itm.metal_type || 'Gold', topUpPcs, topUpGross, topUpGross, topUpFine, now)
      } else {
        db.prepare(
          `UPDATE stock_ledger SET pcs_delta = pcs_delta + ?, gross_weight_delta = gross_weight_delta + ?, net_weight_delta = net_weight_delta + ?, fine_delta = fine_delta + ? WHERE id = ?`
        ).run(topUpPcs, topUpGross, topUpGross, topUpFine, adjId)
      }
    }
  }

  // ==========================================================================
  // 20. CONSISTENCY VERIFICATION & METRICS EXTRACTION
  // ==========================================================================
  console.log('Calculating Post-Seed Verification Metrics...')

  const customersCount = (db.prepare(`SELECT COUNT(*) as c FROM customers WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const suppliersCount = (db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const karigarsCount = (db.prepare(`SELECT COUNT(*) as c FROM karigars WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const itemsCount = (db.prepare(`SELECT COUNT(*) as c FROM items WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const stockItemsCount = (db.prepare(`SELECT COUNT(*) as c FROM jewellery_stock_items WHERE deleted_at IS NULL`).get() as any)?.c || 0

  const stockLedgerTotals = (db.prepare(
    `SELECT
      COALESCE(SUM(pcs_delta), 0) as pcs,
      COALESCE(SUM(gross_weight_delta), 0) as gross,
      COALESCE(SUM(net_weight_delta), 0) as net,
      COALESCE(SUM(fine_delta), 0) as fine
    FROM stock_ledger`
  ).get() as any) || { pcs: 0, gross: 0, net: 0, fine: 0 }

  const todaySales = (db.prepare(
    `SELECT
      COALESCE(SUM(grand_total), 0) as amt,
      COUNT(*) as count
    FROM sales_invoices
    WHERE invoice_date = ? AND status != 'CANCELLED' AND deleted_at IS NULL`
  ).get(today) as any) || { amt: 0, count: 0 }

  const todayPurchases = (db.prepare(
    `SELECT
      COALESCE(SUM(grand_total), 0) as amt,
      COUNT(*) as count
    FROM purchase_invoices
    WHERE invoice_date = ? AND status != 'CANCELLED' AND deleted_at IS NULL`
  ).get(today) as any) || { amt: 0, count: 0 }

  const salesCount = (db.prepare(`SELECT COUNT(*) as c FROM sales_invoices WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const purchaseCount = (db.prepare(`SELECT COUNT(*) as c FROM purchase_invoices WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const ordersCount = (db.prepare(`SELECT COUNT(*) as c FROM customer_orders WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const quotationsCount = (db.prepare(`SELECT COUNT(*) as c FROM quotations WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const advancesCount = (db.prepare(`SELECT COUNT(*) as c FROM customer_advances WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const consignmentsCount = (db.prepare(`SELECT COUNT(*) as c FROM consignment_inwards WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const repairsCount = (db.prepare(`SELECT COUNT(*) as c FROM repair_jobs WHERE deleted_at IS NULL`).get() as any)?.c || 0
  const mfgOrdersCount = (db.prepare(`SELECT COUNT(*) as c FROM manufacturing_orders WHERE deleted_at IS NULL`).get() as any)?.c || 0

  // Outstanding Receivables & Payables
  const accountBalances = db.prepare(
    `SELECT
      a.id,
      a.account_type,
      COALESCE(SUM(al.cash_nave - al.cash_jama), 0) as net_cash
    FROM accounts a
    LEFT JOIN account_ledger al ON al.account_id = a.id
    GROUP BY a.id, a.account_type`
  ).all() as { id: string; account_type: string; net_cash: number }[]

  let totalReceivables = 0
  let totalPayables = 0
  for (const b of accountBalances) {
    if (b.net_cash > 0.01) {
      totalReceivables += b.net_cash
    } else if (b.net_cash < -0.01) {
      totalPayables += Math.abs(b.net_cash)
    }
  }

  // Cash In Hand
  const cashLedger = db.prepare(
    `SELECT
      COALESCE(SUM(cash_jama - cash_nave), 0) as balance
    FROM account_ledger
    WHERE source_type IN ('SALE_PAYMENT', 'PURCHASE_PAYMENT', 'CASH_RECEIPT', 'CASH_PAYMENT')`
  ).get() as any
  const cashClosing = 150000 + (cashLedger?.balance || 0)

  return {
    firmName: 'Shree Jewellery',
    customersCount,
    suppliersCount,
    karigarsCount,
    itemsCount,
    stockItemsCount,
    openingStockPcs: stockLedgerTotals.pcs,
    purchaseInvoicesCount: purchaseCount,
    todayPurchasesAmount: todayPurchases.amt,
    salesInvoicesCount: salesCount,
    todaySalesAmount: todaySales.amt,
    customerOrdersCount: ordersCount,
    quotationsCount: quotationsCount,
    customerAdvancesCount: advancesCount,
    consignmentsCount,
    repairsCount,
    manufacturingOrdersCount: mfgOrdersCount,
    totalGrossWeight: roundNumber(stockLedgerTotals.gross, 3),
    totalNetWeight: roundNumber(stockLedgerTotals.net, 3),
    totalFineWeight: roundNumber(stockLedgerTotals.fine, 3),
    totalStockPieces: stockLedgerTotals.pcs,
    totalReceivables: roundNumber(totalReceivables, 2),
    totalPayables: roundNumber(totalPayables, 2),
    cashClosingBalance: roundNumber(cashClosing, 2)
  }
}
