import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration027: Migration = {
  id: '027_seed_item_opening_stock_data',
  name: 'Seed Standard Opening Stock Items for Gold, Silver, Diamond & Platinum',
  up: (database: Database.Database) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const stockDate = new Date().toISOString().slice(0, 10)

    // Helper functions to find IDs
    const getItem = (namePattern: string, metal: string) => {
      const row = database
        .prepare(
          `SELECT id, item_name, metal_type FROM items WHERE LOWER(item_name) LIKE LOWER(?) AND metal_type = ? AND deleted_at IS NULL LIMIT 1`
        )
        .get(`%${namePattern}%`, metal) as { id: string; item_name: string; metal_type: string } | undefined
      return row
    }

    const getStamp = (namePattern: string, metal: string) => {
      const row = database
        .prepare(
          `SELECT id, stamp_name FROM item_stamps WHERE LOWER(stamp_name) LIKE LOWER(?) AND metal_type = ? AND deleted_at IS NULL LIMIT 1`
        )
        .get(`%${namePattern}%`, metal) as { id: string; stamp_name: string } | undefined
      return row
    }

    const getDesign = (namePattern: string) => {
      const row = database
        .prepare(
          `SELECT id, design_name FROM item_designs WHERE LOWER(design_name) LIKE LOWER(?) AND deleted_at IS NULL LIMIT 1`
        )
        .get(`%${namePattern}%`) as { id: string; design_name: string } | undefined
      return row
    }

    // Standard Sample Opening Stock Records
    const seedRows = [
      {
        id: 'os-gold-ring-cast',
        itemPattern: 'Ring',
        metal: 'Gold',
        stampPattern: '916',
        designPattern: 'Casting',
        huid: 'HUID-916G01',
        location: 'Tray A-1',
        pcs: 10,
        gross: 45.25,
        less: 0.25,
        tanch: 91.66,
        wastage: 1.5,
        unit: 'Gm',
        majuriRate: 250,
        barcode: 'BR-G-RNG-001',
        remark: 'Initial showcase tray stock - 22K Cast Rings'
      },
      {
        id: 'os-gold-bangle-calc',
        itemPattern: 'Bangle',
        metal: 'Gold',
        stampPattern: '916',
        designPattern: 'Calcutta',
        huid: 'HUID-916G02',
        location: 'Tray B-2',
        pcs: 4,
        gross: 68.45,
        less: 0.0,
        tanch: 91.66,
        wastage: 4.0,
        unit: 'Gm',
        majuriRate: 550,
        barcode: 'BR-G-BGL-002',
        remark: '22K Calcutta handmade bridal bangles'
      },
      {
        id: 'os-gold-necklace-temple',
        itemPattern: 'Necklace',
        metal: 'Gold',
        stampPattern: '916',
        designPattern: 'Antique',
        huid: 'HUID-916G03',
        location: 'Counter-1 Showcase',
        pcs: 1,
        gross: 85.2,
        less: 6.2,
        tanch: 91.66,
        wastage: 5.0,
        unit: 'Gm',
        majuriRate: 650,
        barcode: 'BR-G-NCK-003',
        remark: 'Antique temple work choker set with synthetic kemp'
      },
      {
        id: 'os-gold-chain-plain',
        itemPattern: 'Chain',
        metal: 'Gold',
        stampPattern: '916',
        designPattern: 'Plain',
        huid: 'HUID-916G04',
        location: 'Tray C-1',
        pcs: 5,
        gross: 62.5,
        less: 0.0,
        tanch: 91.66,
        wastage: 1.0,
        unit: 'Gm',
        majuriRate: 180,
        barcode: 'BR-G-CHN-004',
        remark: 'Machine rope & box chains'
      },
      {
        id: 'os-gold-earring-cz',
        itemPattern: 'Earring',
        metal: 'Gold',
        stampPattern: '750',
        designPattern: 'CZ',
        huid: 'HUID-750G05',
        location: 'Showcase-3',
        pcs: 6,
        gross: 28.6,
        less: 3.2,
        tanch: 75.0,
        wastage: 3.5,
        unit: 'Gm',
        majuriRate: 450,
        barcode: 'BR-G-ERR-005',
        remark: '18K CZ studded light weight tops & hangings'
      },
      {
        id: 'os-gold-coin-24k',
        itemPattern: 'Coin',
        metal: 'Gold',
        stampPattern: '999',
        designPattern: 'Plain',
        huid: 'COIN-999-10G',
        location: 'Vault Locker-1',
        pcs: 5,
        gross: 50.0,
        less: 0.0,
        tanch: 99.9,
        wastage: 0.0,
        unit: 'Pcs',
        majuriRate: 150,
        barcode: 'BR-G-COIN-006',
        remark: '24K 999 Laxmi / Ganesh 10g Gold Coins'
      },
      {
        id: 'os-silver-payal',
        itemPattern: 'Payal',
        metal: 'Silver',
        stampPattern: '800',
        designPattern: 'Bombay',
        huid: '',
        location: 'Tray S-1',
        pcs: 12,
        gross: 340.0,
        less: 15.0,
        tanch: 80.0,
        wastage: 3.0,
        unit: 'Gm',
        majuriRate: 45,
        barcode: 'BR-S-PYL-007',
        remark: 'Traditional Bombay cast silver anklets'
      },
      {
        id: 'os-silver-utensil',
        itemPattern: 'Utensil',
        metal: 'Silver',
        stampPattern: '925',
        designPattern: 'Plain',
        huid: '',
        location: 'Counter-S Glass',
        pcs: 4,
        gross: 450.0,
        less: 0.0,
        tanch: 92.5,
        wastage: 2.0,
        unit: 'Gm',
        majuriRate: 35,
        barcode: 'BR-S-UTN-008',
        remark: '925 Sterling Silver Pooja Thali & Diya set'
      },
      {
        id: 'os-diamond-solitaire-ring',
        itemPattern: 'Diamond',
        metal: 'Diamond',
        stampPattern: '750',
        designPattern: 'Solitaire',
        huid: 'HUID-DIA09',
        location: 'VIP Showcase',
        pcs: 1,
        gross: 4.85,
        less: 0.15,
        tanch: 75.0,
        wastage: 0.0,
        unit: 'Pcs',
        majuriRate: 1500,
        barcode: 'BR-D-SOL-009',
        diamondCarats: 0.75,
        diamondPcs: 1,
        stoneAmount: 65000,
        remark: '18K Diamond Solitaire Engagement Ring (VVS-FG, 0.75 Cts)'
      },
      {
        id: 'os-platinum-band',
        itemPattern: 'Platinum',
        metal: 'Platinum',
        stampPattern: '950',
        designPattern: 'Casting',
        huid: 'PT950-BND',
        location: 'Tray P-1',
        pcs: 2,
        gross: 14.5,
        less: 0.0,
        tanch: 95.0,
        wastage: 2.0,
        unit: 'Gm',
        majuriRate: 450,
        barcode: 'BR-P-BND-010',
        remark: 'Pt 950 Couple Love Bands (His & Hers)'
      }
    ]

    const insertOpeningStock = database.prepare(`
      INSERT OR REPLACE INTO item_opening_stock (
        id, stock_date, item_id, stamp_id, design_id, barcode, huid, location,
        diamond_carats, diamond_pcs, stone_amount, remark,
        pcs, gross_weight, less_weight, add_weight, net_weight, tanch,
        wastage, hishob, unit, fine, majuri_rate, majuri, active,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)

    const insertLedger = database.prepare(`
      INSERT OR REPLACE INTO stock_ledger (
        id, source_type, source_id, entry_date,
        item_id, stamp_id, design_id, metal_type, pcs_delta,
        gross_weight_delta, net_weight_delta, fine_delta, narration,
        created_at
      )
      VALUES (?, 'OPENING_STOCK', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const row of seedRows) {
      // Find matching item or fallback
      let item = getItem(row.itemPattern, row.metal)
      if (!item) {
        item = database
          .prepare(`SELECT id, item_name, metal_type FROM items WHERE metal_type = ? AND deleted_at IS NULL LIMIT 1`)
          .get(row.metal) as { id: string; item_name: string; metal_type: string } | undefined
      }

      if (!item) continue

      const stamp = getStamp(row.stampPattern, row.metal)
      const design = getDesign(row.designPattern)

      const netWeight = row.gross - row.less
      const hishob = row.tanch + row.wastage
      const fine = Number(((netWeight * hishob) / 100).toFixed(3))
      const majuri =
        row.unit === 'Pcs'
          ? row.pcs * row.majuriRate
          : row.unit === 'Kg'
            ? (netWeight / 1000) * row.majuriRate
            : netWeight * row.majuriRate

      insertOpeningStock.run(
        row.id,
        stockDate,
        item.id,
        stamp?.id || null,
        design?.id || null,
        row.barcode,
        row.huid,
        row.location,
        row.diamondCarats || 0,
        row.diamondPcs || 0,
        row.stoneAmount || 0,
        row.remark,
        row.pcs,
        row.gross,
        row.less,
        0,
        netWeight,
        row.tanch,
        row.wastage,
        hishob,
        row.unit,
        fine,
        row.majuriRate,
        majuri,
        now,
        now
      )

      insertLedger.run(
        `stk-${row.id}`,
        row.id,
        stockDate,
        item.id,
        stamp?.id || null,
        design?.id || null,
        item.metal_type,
        row.pcs,
        row.gross,
        netWeight,
        fine,
        `Opening stock: ${item.item_name}`,
        now
      )
    }
  }
}
