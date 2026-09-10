import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration022: Migration = {
  id: '022_seed_standard_items_and_groups',
  name: 'Seed Standard Jewellery Groups, Stamps, Designs, and Catalog Items',
  up: (database: Database.Database) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Seed Item Groups
    const groups = [
      { id: 'grp-gold-rings', name: 'Gold Rings', metal: 'Gold' },
      { id: 'grp-gold-chains', name: 'Gold Chains', metal: 'Gold' },
      { id: 'grp-gold-necklaces', name: 'Gold Necklaces & Sets', metal: 'Gold' },
      { id: 'grp-gold-bangles', name: 'Gold Bangles & Kadas', metal: 'Gold' },
      { id: 'grp-gold-earrings', name: 'Gold Earrings & Jhumkas', metal: 'Gold' },
      { id: 'grp-gold-mangalsutra', name: 'Gold Mangalsutra', metal: 'Gold' },
      { id: 'grp-gold-coins', name: 'Gold Coins & Bars', metal: 'Gold' },
      { id: 'grp-diamond-jewellery', name: 'Diamond Jewellery', metal: 'Diamond' },
      { id: 'grp-silver-payal', name: 'Silver Payal / Anklets', metal: 'Silver' },
      { id: 'grp-silver-bangles', name: 'Silver Bangles & Kadas', metal: 'Silver' },
      { id: 'grp-silver-coins', name: 'Silver Coins & Bars', metal: 'Silver' },
      { id: 'grp-silver-utensils', name: 'Silver Pooja Articles & Utensils', metal: 'Silver' },
      { id: 'grp-platinum-jewellery', name: 'Platinum Jewellery', metal: 'Platinum' }
    ]

    const insertGroup = database.prepare(`
      INSERT OR IGNORE INTO item_groups (id, group_name, metal_type, active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `)

    for (const g of groups) {
      const existing = database
        .prepare(`SELECT id FROM item_groups WHERE LOWER(group_name) = LOWER(?) AND deleted_at IS NULL`)
        .get(g.name)
      if (!existing) {
        insertGroup.run(g.id, g.name, g.metal, now, now)
      }
    }

    // 2. Seed Item Stamps
    const stamps = [
      { id: 'stamp-gold-916', name: '916 BIS Hallmark (22K)', metal: 'Gold' },
      { id: 'stamp-gold-750', name: '750 Hallmark (18K)', metal: 'Gold' },
      { id: 'stamp-gold-999', name: '999 Pure (24K)', metal: 'Gold' },
      { id: 'stamp-gold-585', name: '585 Hallmark (14K)', metal: 'Gold' },
      { id: 'stamp-silver-925', name: '925 Sterling', metal: 'Silver' },
      { id: 'stamp-silver-999', name: '999 Fine Silver', metal: 'Silver' },
      { id: 'stamp-silver-800', name: '800 Standard', metal: 'Silver' },
      { id: 'stamp-platinum-950', name: 'Pt 950 Hallmark', metal: 'Platinum' }
    ]

    const insertStamp = database.prepare(`
      INSERT OR IGNORE INTO item_stamps (id, stamp_name, metal_type, active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `)

    for (const s of stamps) {
      const existing = database
        .prepare(`SELECT id FROM item_stamps WHERE LOWER(stamp_name) = LOWER(?) AND deleted_at IS NULL`)
        .get(s.name)
      if (!existing) {
        insertStamp.run(s.id, s.name, s.metal, now, now)
      }
    }

    // 3. Seed Item Designs
    const designs = [
      { id: 'dsg-plain-solid', name: 'Plain Classic Solid', metal: 'Gold' },
      { id: 'dsg-antique-temple', name: 'Antique & Temple Work', metal: 'Gold' },
      { id: 'dsg-casting-cnc', name: 'Casting / Modern CNC', metal: 'Gold' },
      { id: 'dsg-calcutta-handmade', name: 'Calcutta Handmade', metal: 'Gold' },
      { id: 'dsg-filigree-rajkot', name: 'Rajkot Filigree', metal: 'Gold' },
      { id: 'dsg-cz-studded', name: 'CZ / American Diamond Studded', metal: 'Gold' },
      { id: 'dsg-solitaire-diamond', name: 'Solitaire Diamond', metal: 'Diamond' },
      { id: 'dsg-bombay-polish', name: 'Bombay High Polish', metal: 'Silver' }
    ]

    const insertDesign = database.prepare(`
      INSERT OR IGNORE INTO item_designs (id, design_name, metal_type, description, active, created_at, updated_at)
      VALUES (?, ?, ?, '', 1, ?, ?)
    `)

    for (const d of designs) {
      const existing = database
        .prepare(`SELECT id FROM item_designs WHERE LOWER(design_name) = LOWER(?) AND deleted_at IS NULL`)
        .get(d.name)
      if (!existing) {
        insertDesign.run(d.id, d.name, d.metal, now, now)
      }
    }

    // Helper to find ID by name
    const getGroupId = (name: string) => {
      const row = database
        .prepare(`SELECT id FROM item_groups WHERE LOWER(group_name) = LOWER(?) AND deleted_at IS NULL`)
        .get(name) as { id: string } | undefined
      return row?.id || 'grp-gold-rings'
    }

    const getStampId = (name: string) => {
      const row = database
        .prepare(`SELECT id FROM item_stamps WHERE LOWER(stamp_name) LIKE ? AND deleted_at IS NULL`)
        .get(`%${name.toLowerCase()}%`) as { id: string } | undefined
      return row?.id || null
    }

    const getDesignId = (name: string) => {
      const row = database
        .prepare(`SELECT id FROM item_designs WHERE LOWER(design_name) LIKE ? AND deleted_at IS NULL`)
        .get(`%${name.toLowerCase()}%`) as { id: string } | undefined
      return row?.id || null
    }

    // 4. Seed Raw Jewelry Items Catalog
    const items = [
      {
        id: 'item-gld-rng-22k',
        code: 'GLD-RNG-22K',
        name: 'Gold Ladies Ring 22K',
        metal: 'Gold',
        group: 'Gold Rings',
        karat: '22K',
        tunch: 91.6,
        wastage: 8.5,
        labourRate: 450,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'G000001',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 5,
        minWt: 15.0,
        desc: 'Hallmark 22K 916 Ladies Fancy Ring'
      },
      {
        id: 'item-gld-gents-rng',
        code: 'GLD-GENTS-RNG',
        name: 'Gold Gents Ring 22K',
        metal: 'Gold',
        group: 'Gold Rings',
        karat: '22K',
        tunch: 91.6,
        wastage: 9.0,
        labourRate: 400,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'G000002',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 3,
        minWt: 20.0,
        desc: 'Chhote / Mote Gents Casting Ring'
      },
      {
        id: 'item-gld-chn-22k',
        code: 'GLD-CHN-22K',
        name: 'Gold Rope Chain 22K',
        metal: 'Gold',
        group: 'Gold Chains',
        karat: '22K',
        tunch: 91.6,
        wastage: 7.0,
        labourRate: 350,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'G000003',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 5,
        minWt: 50.0,
        desc: 'Machine-made durable daily wear chain'
      },
      {
        id: 'item-gld-nck-22k',
        code: 'GLD-NCK-22K',
        name: 'Gold Bridal Necklace Set 22K',
        metal: 'Gold',
        group: 'Gold Necklaces & Sets',
        karat: '22K',
        tunch: 91.6,
        wastage: 12.0,
        labourRate: 650,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'G000004',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 2,
        minWt: 60.0,
        desc: 'Heavy bridal necklace with matching earrings'
      },
      {
        id: 'item-gld-bng-22k',
        code: 'GLD-BNG-22K',
        name: 'Gold CNC Bangles Pair 22K',
        metal: 'Gold',
        group: 'Gold Bangles & Kadas',
        karat: '22K',
        tunch: 91.6,
        wastage: 8.0,
        labourRate: 380,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'G000005',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 4,
        minWt: 40.0,
        desc: 'CNC cutting laser finish gold bangles pair'
      },
      {
        id: 'item-gld-mng-22k',
        code: 'GLD-MNG-22K',
        name: 'Gold Traditional Mangalsutra 22K',
        metal: 'Gold',
        group: 'Gold Mangalsutra',
        karat: '22K',
        tunch: 91.6,
        wastage: 9.5,
        labourRate: 480,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'G000006',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 3,
        minWt: 25.0,
        desc: 'Vati / Pendant with black beads chain'
      },
      {
        id: 'item-gld-jhm-22k',
        code: 'GLD-JHM-22K',
        name: 'Gold Antique Jhumka 22K',
        metal: 'Gold',
        group: 'Gold Earrings & Jhumkas',
        karat: '22K',
        tunch: 91.6,
        wastage: 11.0,
        labourRate: 550,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'G000007',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 4,
        minWt: 30.0,
        desc: 'Traditional temple antique polish jhumka'
      },
      {
        id: 'item-gld-coin-999',
        code: 'GLD-COIN-999',
        name: '24K Gold Coin 999 Fine',
        metal: 'Gold',
        group: 'Gold Coins & Bars',
        karat: '24K',
        tunch: 99.9,
        wastage: 0.0,
        labourRate: 150,
        labourUnit: 'Pcs',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 0,
        barcodeItem: 1,
        barcodeType: 'QR',
        barcodeValue: 'G000008',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 10,
        minWt: 50.0,
        desc: 'Lakshmi / Ganesh mint certified bullion coin'
      },
      {
        id: 'item-dmd-rng-18k',
        code: 'DMD-RNG-18K',
        name: 'Diamond Solitaire Ring 18K',
        metal: 'Diamond',
        group: 'Diamond Jewellery',
        karat: '18K',
        tunch: 75.0,
        wastage: 10.0,
        labourRate: 950,
        labourUnit: 'Gm',
        isStudded: 1,
        stoneDeduction: 'Gross - Stone = Net',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'D000001',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 3,
        minWt: 10.0,
        desc: 'IGI certified diamond studded 18K yellow/white gold ring'
      },
      {
        id: 'item-sil-pyl-925',
        code: 'SIL-PYL-925',
        name: 'Silver Payal 92.5 Sterling',
        metal: 'Silver',
        group: 'Silver Payal / Anklets',
        karat: '925',
        tunch: 92.5,
        wastage: 5.0,
        labourRate: 35,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 0,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'S000001',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 10,
        minWt: 100.0,
        desc: 'Bombay ghungroo fancy silver payal'
      },
      {
        id: 'item-sil-kda-925',
        code: 'SIL-KDA-925',
        name: 'Silver Gents Kada 92.5',
        metal: 'Silver',
        group: 'Silver Bangles & Kadas',
        karat: '925',
        tunch: 92.5,
        wastage: 4.0,
        labourRate: 30,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 0,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'S000002',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 5,
        minWt: 80.0,
        desc: 'Solid heavy Punjabi Kada in 92.5 sterling silver'
      },
      {
        id: 'item-sil-coin-999',
        code: 'SIL-COIN-999',
        name: 'Silver Coin 99.9 Fine (10g / 50g / 100g)',
        metal: 'Silver',
        group: 'Silver Coins & Bars',
        karat: '999',
        tunch: 99.9,
        wastage: 0.0,
        labourRate: 50,
        labourUnit: 'Pcs',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 0,
        barcodeItem: 1,
        barcodeType: 'QR',
        barcodeValue: 'S000003',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 25,
        minWt: 500.0,
        desc: 'Pure fine silver bullion gift coin'
      },
      {
        id: 'item-sil-puja-set',
        code: 'SIL-PUJA-SET',
        name: 'Silver Pooja Thali & Diya Set',
        metal: 'Silver',
        group: 'Silver Pooja Articles & Utensils',
        karat: '800',
        tunch: 80.0,
        wastage: 6.0,
        labourRate: 25,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 0,
        barcodeItem: 0,
        barcodeType: '',
        barcodeValue: '',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 2,
        minWt: 200.0,
        desc: 'Handcrafted religious pooja thali set'
      },
      {
        id: 'item-plt-band-950',
        code: 'PLT-BAND-950',
        name: 'Platinum Couple Band Pt950',
        metal: 'Platinum',
        group: 'Platinum Jewellery',
        karat: 'Pt950',
        tunch: 95.0,
        wastage: 8.0,
        labourRate: 800,
        labourUnit: 'Gm',
        isStudded: 0,
        stoneDeduction: 'None',
        huid: 1,
        barcodeItem: 1,
        barcodeType: 'CODE128',
        barcodeValue: 'P000001',
        hsn: '7113',
        gst: 3.0,
        packWt: 0,
        minQty: 2,
        minWt: 12.0,
        desc: 'Pt 950 purity stamped matching wedding bands'
      }
    ]

    const insertItem = database.prepare(`
      INSERT INTO items (
        id, item_code, item_name, metal_type, item_group_id, default_stamp_id, default_design_id,
        purity_karat, is_studded, stone_deduction_type, huid_required, min_stock_qty, min_stock_weight,
        description, barcode_item, barcode_type, barcode_value, labour_charges_by, sale_purchase_by,
        gst_hsn_code, gst_rate, fixed_weight_per_pcs, default_tanch, default_wastage, default_labour_rate,
        labour_rate_type, active, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, 1, ?, ?
      )
    `)

    for (const it of items) {
      const existing = database
        .prepare(`SELECT id FROM items WHERE LOWER(item_name) = LOWER(?) AND deleted_at IS NULL`)
        .get(it.name)

      if (!existing) {
        const groupId = getGroupId(it.group)
        const stampId = getStampId(it.karat)
        const designId = getDesignId('solid')

        insertItem.run(
          it.id,
          it.code,
          it.name,
          it.metal,
          groupId,
          stampId,
          designId,
          it.karat,
          it.isStudded,
          it.stoneDeduction,
          it.huid,
          it.minQty,
          it.minWt,
          it.desc,
          it.barcodeItem,
          it.barcodeType,
          it.barcodeValue,
          it.labourUnit,
          'Fine',
          it.hsn,
          it.gst,
          it.packWt,
          it.tunch,
          it.wastage,
          it.labourRate,
          it.labourUnit,
          now,
          now
        )
      }
    }
  }
}
