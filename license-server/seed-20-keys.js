require('dotenv').config()
const mongoose = require('mongoose')
const { License } = require('./models/License')
const { generateFormattedProductKey } = require('./crypto')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery_erp_licensing'

const initial20Keys = [
  // --- ENTERPRISE (7 Keys) ---
  {
    productKey: 'JERP-ENT-8N3V-19YB-QM4Z',
    edition: 'ENTERPRISE',
    customerName: 'Royal Diamond & Gold Jewels',
    firmName: 'Royal Jewels Flagship Store',
    customerEmail: 'royal.diamond@showrooms.com',
    phone: '+91 98200 11223',
    status: 'AVAILABLE',
    expiresAt: null, // Lifetime Perpetual
    notes: 'Enterprise Perpetual - Flagship Showroom'
  },
  {
    productKey: 'JERP-ENT-9K2M-44PX-LW7B',
    edition: 'ENTERPRISE',
    customerName: 'Kalyan Heritage Jewellers',
    firmName: 'Kalyan Heritage Store #1',
    customerEmail: 'admin@kalyanheritage.com',
    phone: '+91 98110 33445',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: '1-Year Enterprise Annual Plan'
  },
  {
    productKey: 'JERP-ENT-7V5L-88YT-NB9Q',
    edition: 'ENTERPRISE',
    customerName: 'Malabar Elite Jewels',
    firmName: 'Malabar Luxury Outlet',
    customerEmail: 'ops@malabarelite.com',
    phone: '+91 98330 55667',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    notes: '2-Year Enterprise Multi-Counter'
  },
  {
    productKey: 'JERP-ENT-3X9W-12KA-PT6D',
    edition: 'ENTERPRISE',
    customerName: 'Tanishq Diamond Boutique',
    firmName: 'Tanishq Boutique Grand Central',
    customerEmail: 'boutique@tanishqpartners.com',
    phone: '+91 98440 77889',
    status: 'AVAILABLE',
    expiresAt: null,
    notes: 'Lifetime Enterprise'
  },
  {
    productKey: 'JERP-ENT-6B4R-99MN-CV2X',
    edition: 'ENTERPRISE',
    customerName: 'Joyalukkas Premium Gold',
    firmName: 'Joyalukkas Mall Branch',
    customerEmail: 'store.mall@joyalukkaspartner.com',
    phone: '+91 98550 99001',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Enterprise 1 Year'
  },
  {
    productKey: 'JERP-ENT-2M8T-71VF-KL5W',
    edition: 'ENTERPRISE',
    customerName: 'Tribhovandas Bhimji Zaveri Partner',
    firmName: 'TBZ Zaveri Bazaar Store',
    customerEmail: 'zaveri@tbzpartner.com',
    phone: '+91 98660 11224',
    status: 'AVAILABLE',
    expiresAt: null,
    notes: 'Enterprise Lifetime Zaveri'
  },
  {
    productKey: 'JERP-ENT-5Y3P-80XQ-JH4M',
    edition: 'ENTERPRISE',
    customerName: 'Senco Gold & Diamonds Franchise',
    firmName: 'Senco South Hub',
    customerEmail: 'southhub@sencopartner.com',
    phone: '+91 98770 33446',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Enterprise 1 Year Franchise'
  },

  // --- PROFESSIONAL (8 Keys) ---
  {
    productKey: 'JERP-PRO-7K4M-92XA-PL8Q',
    edition: 'PROFESSIONAL',
    customerName: 'Tanishq Authorized Partner',
    firmName: 'Tanishq Retail Outlet #14',
    customerEmail: 'retail14@tanishqpartners.com',
    phone: '+91 98111 22334',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Professional 1-Year'
  },
  {
    productKey: 'JERP-PRO-5M1N-88LK-QW4E',
    edition: 'PROFESSIONAL',
    customerName: 'Shree Krishna Jewellers',
    firmName: 'Shree Krishna Main Market',
    customerEmail: 'info@shreekrishnajewels.com',
    phone: '+91 98222 33445',
    status: 'AVAILABLE',
    expiresAt: null, // Lifetime
    notes: 'Professional Lifetime'
  },
  {
    productKey: 'JERP-PRO-4T8B-23ZD-VN9R',
    edition: 'PROFESSIONAL',
    customerName: 'Radha Rani Ornaments',
    firmName: 'Radha Rani Jewellery House',
    customerEmail: 'contact@radharanijewels.in',
    phone: '+91 98333 44556',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Professional 1-Year Subscription'
  },
  {
    productKey: 'JERP-PRO-9C3X-77KA-PL2M',
    edition: 'PROFESSIONAL',
    customerName: 'Laxmi Narayan Jewellers',
    firmName: 'Laxmi Narayan Gold Palace',
    customerEmail: 'laxmi.jewels@gmail.com',
    phone: '+91 98444 55667',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    notes: 'Professional 2-Year Plan'
  },
  {
    productKey: 'JERP-PRO-1W7V-66TH-GB5Y',
    edition: 'PROFESSIONAL',
    customerName: 'Balaji Gold & Silver Arts',
    firmName: 'Balaji Jewellery Works',
    customerEmail: 'balaji.arts@yahoo.com',
    phone: '+91 98555 66778',
    status: 'AVAILABLE',
    expiresAt: null,
    notes: 'Professional Lifetime'
  },
  {
    productKey: 'JERP-PRO-8R2Q-14UF-MN6T',
    edition: 'PROFESSIONAL',
    customerName: 'Mahalaxmi Gems & Jewels',
    firmName: 'Mahalaxmi Gems Central',
    customerEmail: 'sales@mahalaxmigems.com',
    phone: '+91 98666 77889',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Professional 1-Year'
  },
  {
    productKey: 'JERP-PRO-6D9L-35KP-AZ8W',
    edition: 'PROFESSIONAL',
    customerName: 'Shree Sai Ornaments',
    firmName: 'Shree Sai Jewellery Corner',
    customerEmail: 'shreesai.ornaments@outlook.com',
    phone: '+91 98777 88990',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Professional 1-Year'
  },
  {
    productKey: 'JERP-PRO-3H5P-90YR-TV4B',
    edition: 'PROFESSIONAL',
    customerName: 'Swarna Mahal Jewellers',
    firmName: 'Swarna Mahal City Center',
    customerEmail: 'swarnamahal@swarnamahal.in',
    phone: '+91 98888 99001',
    status: 'AVAILABLE',
    expiresAt: null,
    notes: 'Professional Lifetime'
  },

  // --- BASIC (5 Keys) ---
  {
    productKey: 'JERP-BAS-4K1L-90ZA-PT2W',
    edition: 'BASIC',
    customerName: 'Shree Ganesh Jewellers',
    firmName: 'Shree Ganesh Store',
    customerEmail: 'ganesh.jewels@gmail.com',
    phone: '+91 98111 99887',
    status: 'AVAILABLE',
    expiresAt: null, // Lifetime Basic
    notes: 'Basic Perpetual License'
  },
  {
    productKey: 'JERP-BAS-2V6M-31LK-JH8R',
    edition: 'BASIC',
    customerName: 'Ambika Silver Palace',
    firmName: 'Ambika Silver Shop',
    customerEmail: 'ambika.silver@rediffmail.com',
    phone: '+91 98222 88776',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Basic 1-Year Retail'
  },
  {
    productKey: 'JERP-BAS-8T4Q-75WN-CB1Y',
    edition: 'BASIC',
    customerName: 'Navratna Jewellers',
    firmName: 'Navratna Jewellery Stall',
    customerEmail: 'navratna.stall@gmail.com',
    phone: '+91 98333 77665',
    status: 'AVAILABLE',
    expiresAt: null,
    notes: 'Basic Lifetime'
  },
  {
    productKey: 'JERP-BAS-5P9X-18VD-KL3M',
    edition: 'BASIC',
    customerName: 'Om Jewellers Counter #2',
    firmName: 'Om Jewellery Point',
    customerEmail: 'omjewellers.point@yahoo.in',
    phone: '+91 98444 66554',
    status: 'AVAILABLE',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    notes: 'Basic 1-Year Retail'
  },
  {
    productKey: 'JERP-BAS-7N2L-64HF-AZ9Q',
    edition: 'BASIC',
    customerName: 'Vardhaman Jewellers',
    firmName: 'Vardhaman Jewellery Corner',
    customerEmail: 'vardhaman.jewel@gmail.com',
    phone: '+91 98555 55443',
    status: 'AVAILABLE',
    expiresAt: null,
    notes: 'Basic Lifetime'
  }
]

async function seed20Keys() {
  console.log(`📡 Connecting to MongoDB at: ${MONGODB_URI}...`)
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB.')

  let insertedCount = 0
  let updatedCount = 0

  for (const item of initial20Keys) {
    const existing = await License.findOne({ productKey: item.productKey })
    if (!existing) {
      await License.create(item)
      insertedCount++
    } else {
      // Update details to ensure latest info
      await License.updateOne({ productKey: item.productKey }, { $set: item })
      updatedCount++
    }
  }

  const allLicenses = await License.find().sort({ edition: 1, productKey: 1 })

  console.log('\n========================================================================')
  console.log(`💎 20 Product Keys Successfully Seeded in MongoDB!`)
  console.log(`   (New Inserted: ${insertedCount}, Updated: ${updatedCount}, Total in DB: ${allLicenses.length})`)
  console.log('========================================================================\n')

  console.table(
    allLicenses.map((l, index) => ({
      '#': index + 1,
      'Product Key': l.productKey,
      Edition: l.edition,
      Customer: l.customerName,
      Status: l.status,
      Expiry: l.expiresAt ? l.expiresAt.toISOString().split('T')[0] : 'PERPETUAL (Lifetime)'
    }))
  )

  await mongoose.disconnect()
  console.log('\n✅ MongoDB Disconnected. Ready for activation!')
}

seed20Keys().catch((err) => {
  console.error('❌ Error seeding keys:', err)
  process.exit(1)
})
