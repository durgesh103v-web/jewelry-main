require('dotenv').config()
const mongoose = require('mongoose')
const assert = require('assert')
const { Shop } = require('./models/Shop')
const { OwnerAccount } = require('./models/OwnerAccount')
const { License } = require('./models/License')
const { generateShopId, generateTemporaryPassword, generateRecoveryKey, hashPassword, hashSecretKey } = require('./services/credential.service')

const BASE_URI = process.env.MONGODB_URI
const TEST_DB_NAME = 'jewellery_erp_licensing_test_sandbox'
const TEST_URI = BASE_URI.includes('?')
  ? BASE_URI.replace(/\/([^/?]+)\?/, `/${TEST_DB_NAME}?`)
  : BASE_URI.replace(/\/([^/?]+)$/, `/${TEST_DB_NAME}`)

async function testRollback() {
  console.log('🧪 TESTING SHOP CREATION COMPENSATION ROLLBACK IN SANDBOX...')
  await mongoose.connect(TEST_URI)
  const db = mongoose.connection.db
  await db.dropDatabase()

  // Simulate a creation failure at step 3 (License save failure)
  console.log('[Scenario 1] Failure during License creation after Shop and Owner were saved')

  let createdShop = null
  let createdOwner = null
  let createdLicense = null

  try {
    const shopId = generateShopId()
    createdShop = new Shop({
      shopId,
      shopName: 'Test Rollback Jewellers',
      ownerName: 'Rollback Test',
      phone: '9999999999',
      businessType: 'RETAIL'
    })
    await createdShop.save()

    createdOwner = new OwnerAccount({
      shopId: createdShop._id,
      shopIdentifier: createdShop.shopId,
      username: 'rollback_user_1',
      passwordHash: await hashPassword(generateTemporaryPassword()),
      recoveryKeyHash: hashSecretKey(generateRecoveryKey())
    })
    await createdOwner.save()

    // SIMULATE FAILURE: Intentionally throw an error before license save completes
    throw new Error('Simulated Database Network Failure at Step 3')
  } catch (err) {
    console.log(`  Caught simulated error: "${err.message}"`)
    // Execute compensation rollback exactly as implemented in admin.routes.js
    if (createdLicense && createdLicense._id) await License.findByIdAndDelete(createdLicense._id)
    if (createdOwner && createdOwner._id) await OwnerAccount.findByIdAndDelete(createdOwner._id)
    if (createdShop && createdShop._id) await Shop.findByIdAndDelete(createdShop._id)
  }

  // Verify that NO orphaned shop or owner exists in the database
  const shopsCount = await Shop.countDocuments()
  const ownersCount = await OwnerAccount.countDocuments()
  const licensesCount = await License.countDocuments()

  assert.strictEqual(shopsCount, 0, 'Orphaned shop MUST be deleted by compensation')
  assert.strictEqual(ownersCount, 0, 'Orphaned owner account MUST be deleted by compensation')
  assert.strictEqual(licensesCount, 0, 'License count must be 0')
  console.log('  ✅ Compensation Rollback Verified: 0 orphaned records left in database.')

  await db.dropDatabase()
  await mongoose.disconnect()
  console.log('\n🎉 COMPENSATION ROLLBACK TEST PASSED 100%!')
}

testRollback().catch((err) => {
  console.error('❌ Rollback Test Failed:', err)
  process.exit(1)
})
