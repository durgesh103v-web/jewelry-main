require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const { License, EDITION_FEATURES } = require('./models/License')
const { signLicensePayload, generateFormattedProductKey } = require('./crypto')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery_erp_licensing'
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'adm_secret_key_998877'

// Private Ed25519 signing key (PEM)
const PRIVATE_KEY = process.env.ED25519_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOlBcKxNlSkKKoDHRx6/Fou1Cj2vSh4mZ8VUhT5mO8tk
-----END PRIVATE KEY-----`

// Admin authorization middleware
function adminAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin API Key' })
  }
  next()
}

// ----------------------------------------------------------------------------
// 1. DESKTOP CLIENT ACTIVATION ENDPOINT
// Called once during initial installation by the Jewellery ERP Desktop App
// ----------------------------------------------------------------------------
app.post('/api/licenses/activate', async (req, res) => {
  try {
    const { productKey, machineId, product, appVersion } = req.body

    if (!productKey || !machineId) {
      return res.status(400).json({
        success: false,
        message: 'Product Key and Machine ID are required for activation.'
      })
    }

    const key = productKey.trim().toUpperCase()

    // Query license in MongoDB
    const licenseDoc = await License.findOne({ productKey: key })

    if (!licenseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Product key not found. Please check your purchase receipt or contact support.'
      })
    }

    // Check License Status
    if (licenseDoc.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'This license has been suspended. Please contact customer support.'
      })
    }

    if (licenseDoc.status === 'REVOKED') {
      return res.status(403).json({
        success: false,
        message: 'This license has been permanently revoked.'
      })
    }

    // Check Expiration
    if (licenseDoc.expiresAt && new Date(licenseDoc.expiresAt) < new Date()) {
      licenseDoc.status = 'EXPIRED'
      await licenseDoc.save()
      return res.status(403).json({
        success: false,
        message: `License expired on ${licenseDoc.expiresAt.toISOString().split('T')[0]}.`
      })
    }

    // Machine Binding Validation
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    if (!licenseDoc.boundMachineId) {
      // First-time activation: Bind this machine permanently to this product key
      licenseDoc.boundMachineId = machineId
      licenseDoc.status = 'ACTIVE'
      licenseDoc.activatedAt = new Date()
      licenseDoc.activations.push({
        machineId,
        activatedAt: new Date(),
        ipAddress: String(clientIp),
        appVersion: appVersion || '1.0.0'
      })
      await licenseDoc.save()
    } else if (licenseDoc.boundMachineId !== machineId) {
      // Machine mismatch
      return res.status(403).json({
        success: false,
        message:
          'License is already activated on a different computer. If you have replaced your hardware, contact support to reset your license.'
      })
    } else {
      // Re-activation on the same authorized machine (e.g. after reinstall)
      licenseDoc.activations.push({
        machineId,
        activatedAt: new Date(),
        ipAddress: String(clientIp),
        appVersion: appVersion || '1.0.0'
      })
      await licenseDoc.save()
    }

    // Construct the canonical signed license payload
    const payload = {
      licenseId: `LIC-${licenseDoc._id.toString().toUpperCase()}`,
      product: 'JEWELLERY_ERP',
      edition: licenseDoc.edition,
      status: 'ACTIVE',
      machineId: licenseDoc.boundMachineId,
      customerName: licenseDoc.customerName || 'Authorized Jewellery Showroom',
      firmName: licenseDoc.firmName || 'Jewellery Showroom Node',
      activatedAt: (licenseDoc.activatedAt || new Date()).toISOString(),
      expiresAt: licenseDoc.expiresAt ? licenseDoc.expiresAt.toISOString() : null,
      features: licenseDoc.getAllFeatures(),
      version: 1
    }

    // Sign payload with Ed25519 Private Key
    const signature = signLicensePayload(payload, PRIVATE_KEY)

    return res.json({
      success: true,
      message: 'License activated successfully.',
      signedLicense: {
        payload,
        signature
      }
    })
  } catch (err) {
    console.error('Activation error:', err)
    return res.status(500).json({
      success: false,
      message: 'Internal license server error during activation.'
    })
  }
})

// ----------------------------------------------------------------------------
// 2. ADMIN API: CREATE / ISSUE NEW PRODUCT KEYS
// ----------------------------------------------------------------------------
app.post('/api/admin/licenses/create', adminAuth, async (req, res) => {
  try {
    const {
      edition = 'PROFESSIONAL',
      customerName,
      customerEmail,
      firmName,
      phone,
      validityDays, // e.g. 365 or null for lifetime
      customFeatures = [],
      notes,
      quantity = 1
    } = req.body

    const createdLicenses = []

    for (let i = 0; i < quantity; i++) {
      const productKey = generateFormattedProductKey(edition)
      let expiresAt = null
      if (validityDays && Number(validityDays) > 0) {
        expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + Number(validityDays))
      }

      const license = new License({
        productKey,
        edition,
        customerName,
        customerEmail,
        firmName,
        phone,
        status: 'AVAILABLE',
        expiresAt,
        customFeatures,
        notes
      })

      await license.save()
      createdLicenses.push(license)
    }

    return res.json({
      success: true,
      count: createdLicenses.length,
      licenses: createdLicenses
    })
  } catch (err) {
    console.error('Error creating license:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ----------------------------------------------------------------------------
// 3. ADMIN API: LIST / SEARCH ALL LICENSES
// ----------------------------------------------------------------------------
app.get('/api/admin/licenses', adminAuth, async (req, res) => {
  try {
    const { status, edition, search } = req.query
    const query = {}

    if (status) query.status = status
    if (edition) query.edition = edition
    if (search) {
      query.$or = [
        { productKey: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { firmName: new RegExp(search, 'i') },
        { boundMachineId: new RegExp(search, 'i') }
      ]
    }

    const licenses = await License.find(query).sort({ createdAt: -1 }).limit(100)
    return res.json({ success: true, count: licenses.length, licenses })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ----------------------------------------------------------------------------
// 4. ADMIN API: SUSPEND / REVOKE / ACTIVATE STATUS
// ----------------------------------------------------------------------------
app.post('/api/admin/licenses/set-status', adminAuth, async (req, res) => {
  try {
    const { productKey, status } = req.body
    if (!productKey || !['AVAILABLE', 'ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid product key or status.' })
    }

    const doc = await License.findOneAndUpdate(
      { productKey: productKey.trim().toUpperCase() },
      { status },
      { new: true }
    )

    if (!doc) {
      return res.status(404).json({ success: false, message: 'License not found.' })
    }

    return res.json({ success: true, message: `Status updated to ${status}`, license: doc })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ----------------------------------------------------------------------------
// 5. ADMIN API: RESET MACHINE BINDING (When hardware is upgraded/replaced)
// ----------------------------------------------------------------------------
app.post('/api/admin/licenses/reset-machine', adminAuth, async (req, res) => {
  try {
    const { productKey } = req.body
    if (!productKey) {
      return res.status(400).json({ success: false, message: 'Product key required.' })
    }

    const doc = await License.findOneAndUpdate(
      { productKey: productKey.trim().toUpperCase() },
      { boundMachineId: null, status: 'AVAILABLE' },
      { new: true }
    )

    if (!doc) {
      return res.status(404).json({ success: false, message: 'License not found.' })
    }

    return res.json({
      success: true,
      message: 'Machine binding reset successfully. Customer can now activate on their new PC.',
      license: doc
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ----------------------------------------------------------------------------
// 6. HEALTH CHECK
// ----------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Jewellery ERP Commercial Licensing Server',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  })
})

// ----------------------------------------------------------------------------
// AUTO-SEED DEMO KEYS IF DATABASE IS EMPTY
// ----------------------------------------------------------------------------
async function seedDefaultKeysIfEmpty() {
  try {
    const count = await License.countDocuments()
    if (count < 20) {
      console.log('🌱 Seeding 20 commercial product keys into MongoDB...')
      const demoKeys = [
        // --- ENTERPRISE (7 Keys) ---
        {
          productKey: 'JERP-ENT-8N3V-19YB-QM4Z',
          edition: 'ENTERPRISE',
          customerName: 'Royal Diamond & Gold Jewels',
          firmName: 'Royal Jewels Flagship Store',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-ENT-9K2M-44PX-LW7B',
          edition: 'ENTERPRISE',
          customerName: 'Kalyan Heritage Jewellers',
          firmName: 'Kalyan Heritage Store #1',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-ENT-7V5L-88YT-NB9Q',
          edition: 'ENTERPRISE',
          customerName: 'Malabar Elite Jewels',
          firmName: 'Malabar Luxury Outlet',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-ENT-3X9W-12KA-PT6D',
          edition: 'ENTERPRISE',
          customerName: 'Tanishq Diamond Boutique',
          firmName: 'Tanishq Boutique Grand Central',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-ENT-6B4R-99MN-CV2X',
          edition: 'ENTERPRISE',
          customerName: 'Joyalukkas Premium Gold',
          firmName: 'Joyalukkas Mall Branch',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-ENT-2M8T-71VF-KL5W',
          edition: 'ENTERPRISE',
          customerName: 'Tribhovandas Bhimji Zaveri Partner',
          firmName: 'TBZ Zaveri Bazaar Store',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-ENT-5Y3P-80XQ-JH4M',
          edition: 'ENTERPRISE',
          customerName: 'Senco Gold & Diamonds Franchise',
          firmName: 'Senco South Hub',
          status: 'AVAILABLE'
        },

        // --- PROFESSIONAL (8 Keys) ---
        {
          productKey: 'JERP-PRO-7K4M-92XA-PL8Q',
          edition: 'PROFESSIONAL',
          customerName: 'Tanishq Authorized Partner',
          firmName: 'Tanishq Retail Outlet #14',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-PRO-5M1N-88LK-QW4E',
          edition: 'PROFESSIONAL',
          customerName: 'Shree Krishna Jewellers',
          firmName: 'Shree Krishna Main Market',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-PRO-4T8B-23ZD-VN9R',
          edition: 'PROFESSIONAL',
          customerName: 'Radha Rani Ornaments',
          firmName: 'Radha Rani Jewellery House',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-PRO-9C3X-77KA-PL2M',
          edition: 'PROFESSIONAL',
          customerName: 'Laxmi Narayan Jewellers',
          firmName: 'Laxmi Narayan Gold Palace',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-PRO-1W7V-66TH-GB5Y',
          edition: 'PROFESSIONAL',
          customerName: 'Balaji Gold & Silver Arts',
          firmName: 'Balaji Jewellery Works',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-PRO-8R2Q-14UF-MN6T',
          edition: 'PROFESSIONAL',
          customerName: 'Mahalaxmi Gems & Jewels',
          firmName: 'Mahalaxmi Gems Central',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-PRO-6D9L-35KP-AZ8W',
          edition: 'PROFESSIONAL',
          customerName: 'Shree Sai Ornaments',
          firmName: 'Shree Sai Jewellery Corner',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-PRO-3H5P-90YR-TV4B',
          edition: 'PROFESSIONAL',
          customerName: 'Swarna Mahal Jewellers',
          firmName: 'Swarna Mahal City Center',
          status: 'AVAILABLE'
        },

        // --- BASIC (5 Keys) ---
        {
          productKey: 'JERP-BAS-4K1L-90ZA-PT2W',
          edition: 'BASIC',
          customerName: 'Shree Ganesh Jewellers',
          firmName: 'Shree Ganesh Store',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-BAS-2V6M-31LK-JH8R',
          edition: 'BASIC',
          customerName: 'Ambika Silver Palace',
          firmName: 'Ambika Silver Shop',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-BAS-8T4Q-75WN-CB1Y',
          edition: 'BASIC',
          customerName: 'Navratna Jewellers',
          firmName: 'Navratna Jewellery Stall',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-BAS-5P9X-18VD-KL3M',
          edition: 'BASIC',
          customerName: 'Om Jewellers Counter #2',
          firmName: 'Om Jewellery Point',
          status: 'AVAILABLE'
        },
        {
          productKey: 'JERP-BAS-7N2L-64HF-AZ9Q',
          edition: 'BASIC',
          customerName: 'Vardhaman Jewellers',
          firmName: 'Vardhaman Jewellery Corner',
          status: 'AVAILABLE'
        }
      ]

      for (const keyObj of demoKeys) {
        await License.findOneAndUpdate({ productKey: keyObj.productKey }, keyObj, { upsert: true })
      }
      console.log('✅ 20 Default product keys seeded successfully into MongoDB!')
    }
  } catch (e) {
    console.error('Seeding warning:', e.message)
  }
}

// ----------------------------------------------------------------------------
// SERVER STARTUP & MONGOOSE CONNECTION
// ----------------------------------------------------------------------------
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(` Connected to MongoDB: ${MONGODB_URI}`)
    seedDefaultKeysIfEmpty()
    app.listen(PORT, () => {
      console.log(`🚀 Jewellery ERP License Server running on port ${PORT}`)
      console.log(`📍 Activation URL: http://localhost:${PORT}/api/licenses/activate`)
      console.log(`🔒 Admin Auth Key: ${ADMIN_API_KEY}`)
    })
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message)
    console.log('⚠️ Running in standalone mode without DB connection.')
    app.listen(PORT, () => {
      console.log(`🚀 License Server listening on port ${PORT} (DB offline)`)
    })
  })
