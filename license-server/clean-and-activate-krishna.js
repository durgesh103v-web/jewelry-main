const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const dns = require('dns')
dns.setServers(['8.8.8.8', '1.1.1.1'])
const mongoose = require('mongoose')
const { hashSecretKey } = require('./services/credential.service')

async function run() {
  console.log('Connecting to MongoDB Atlas...')
  await mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection.db

  // 1. Verify SuperAdmin is intact
  const superAdmin = await db.collection('adminusers').findOne({ username: 'superadmin' })
  console.log('1. SuperAdmin Account:', superAdmin ? `Preserved (${superAdmin.username})` : 'MISSING!')

  // 2. Remove all licenses except Krishna Shop
  const shop = await db.collection('shops').findOne({ shopName: /Krishna/i })
  if (!shop) {
    console.error('Krishna Jewellery Shop not found in database!')
    await mongoose.disconnect()
    return
  }

  // Delete all licenses not belonging to Krishna Shop
  const deleteLicenses = await db.collection('licenses').deleteMany({
    _id: { $ne: shop.licenseId }
  })
  console.log(`2. Removed ${deleteLicenses.deletedCount} unused/placeholder licenses.`)

  // Delete all other shops if any
  const deleteShops = await db.collection('shops').deleteMany({
    _id: { $ne: shop._id }
  })
  console.log(`3. Removed ${deleteShops.deletedCount} other test shops.`)

  // Delete all other owner accounts
  const deleteOwners = await db.collection('owneraccounts').deleteMany({
    _id: { $ne: shop.ownerAccountId }
  })
  console.log(`4. Removed ${deleteOwners.deletedCount} other test owner accounts.`)

  // Clear test audit logs
  const deleteAudit = await db.collection('auditlogs').deleteMany({})
  console.log(`5. Cleared ${deleteAudit.deletedCount} old audit log entries.`)

  // 6. Update Krishna Shop to ACTIVE
  await db.collection('shops').updateOne(
    { _id: shop._id },
    { $set: { status: 'ACTIVE', updatedAt: new Date() } }
  )
  console.log(`6. Krishna Shop (${shop.shopId}) set to ACTIVE.`)

  // 7. Set clean, known Product Key for Krishna Shop: JERP-ENT-KRIS-HNA1-AML3
  const plainProductKey = 'JERP-ENT-KRIS-HNA1-AML3'
  const keyHash = hashSecretKey(plainProductKey)
  const maskedKey = 'JERP-ENT-****-****-AML3'

  await db.collection('licenses').updateOne(
    { _id: shop.licenseId },
    {
      $set: {
        productKeyHash: keyHash,
        productKeyMasked: maskedKey,
        status: 'ACTIVE',
        boundMachineId: null, // Ready for clean desktop activation
        activations: [],
        updatedAt: new Date()
      }
    }
  )
  console.log(`7. License set to ACTIVE. Product Key: ${plainProductKey}`)

  // 8. Verify Owner Account is active
  const owner = await db.collection('owneraccounts').findOne({ _id: shop.ownerAccountId })
  console.log(`8. Owner Account: username=${owner.username}, shopId=${owner.shopIdentifier}`)

  console.log('\n--- SUMMARY ---')
  console.log('Super Admin Portal URL   : https://admin-portal-sigma-ten.vercel.app/login')
  console.log('Super Admin Username     : superadmin')
  console.log('Super Admin Password     : Admin@Jewellery2026')
  console.log('Shop ID                  : ' + shop.shopId)
  console.log('Shop Name                : ' + shop.shopName)
  console.log('Owner Username           : ' + owner.username)
  console.log('Desktop Activation Key   : ' + plainProductKey)
  console.log('----------------')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
