require('dotenv').config()
const mongoose = require('mongoose')
const assert = require('assert')
const { hashSecretKey } = require('./services/credential.service')

// Target an explicitly isolated test database: jewellery_erp_licensing_test_sandbox
const BASE_URI = process.env.MONGODB_URI
const TEST_DB_NAME = 'jewellery_erp_licensing_test_sandbox'
const TEST_URI = BASE_URI.includes('?')
  ? BASE_URI.replace(/\/([^/?]+)\?/, `/${TEST_DB_NAME}?`)
  : BASE_URI.replace(/\/([^/?]+)$/, `/${TEST_DB_NAME}`)

/**
 * Migration Function under test:
 * 1. Creates a backup collection of legacy records
 * 2. Hashes each plaintext productKey into productKeyHash
 * 3. Populates productKeyMasked
 * 4. Removes the plaintext productKey field
 * 5. Builds unique index
 * 6. Verifies 100% hash lookup
 * 7. Tests rollback from backup
 */
async function runMigration(db) {
  const licenses = db.collection('licenses')
  const backupName = `licenses_backup_${Date.now()}`
  
  // 1. Create isolated backup
  const allDocs = await licenses.find({}).toArray()
  if (allDocs.length > 0) {
    await db.collection(backupName).insertMany(allDocs)
  }

  // 2. Perform Migration
  for (const doc of allDocs) {
    if (!doc.productKey) continue
    const normalizedKey = doc.productKey.trim().toUpperCase()
    const productKeyHash = hashSecretKey(normalizedKey)
    const parts = normalizedKey.split('-')
    const productKeyMasked = parts.length >= 5
      ? `${parts[0]}-${parts[1]}-****-****-${parts[4]}`
      : '****-****-****'

    await licenses.updateOne(
      { _id: doc._id },
      {
        $set: {
          productKeyHash,
          productKeyMasked,
          updatedAt: new Date()
        },
        $unset: {
          productKey: '' // Securely remove plaintext key
        }
      }
    )
  }

  // 3. Build Unique Index on hash
  await licenses.createIndex({ productKeyHash: 1 }, { unique: true, sparse: true })

  return { backupName, count: allDocs.length }
}

async function runSandboxTest() {
  console.log('🧪 STARTING ISOLATED DATABASE MIGRATION & ROLLBACK TEST')
  console.log(`Isolated Sandbox DB: ${TEST_DB_NAME}`)

  await mongoose.connect(TEST_URI)
  const db = mongoose.connection.db

  try {
    // Clean up any old sandbox collections first
    await db.dropDatabase()
    console.log('✅ Cleaned sandbox database.')

    // 1. Seed 20 realistic legacy licenses with plaintext productKey
    console.log('\n[Step 1] Seeding 20 Legacy Plaintext Licenses into Sandbox...')
    const seedLicenses = []
    for (let i = 1; i <= 20; i++) {
      const edition = i <= 5 ? 'BASIC' : i <= 15 ? 'PROFESSIONAL' : 'ENTERPRISE'
      const tag = edition === 'BASIC' ? 'BAS' : edition === 'ENTERPRISE' ? 'ENT' : 'PRO'
      const hex = (i + 100).toString(16).toUpperCase()
      const key = `JERP-${tag}-A1B2-C3D4-${hex.padStart(4, '0')}`
      seedLicenses.push({
        productKey: key,
        edition,
        customerName: `Legacy Customer ${i}`,
        firmName: `Legacy Jewellers ${i}`,
        status: i === 1 ? 'ACTIVE' : 'AVAILABLE',
        boundMachineId: i === 1 ? 'MID-LEGACY-PC-01' : null,
        maxAllowedMachines: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    await db.collection('licenses').insertMany(seedLicenses)
    console.log('✅ Successfully seeded 20 legacy plaintext licenses.')

    // Verify plaintext exists before migration
    const beforeCount = await db.collection('licenses').countDocuments({ productKey: { $exists: true } })
    assert.strictEqual(beforeCount, 20, 'All 20 should have plaintext productKey before migration')

    // 2. Run Migration
    console.log('\n[Step 2] Executing Non-Destructive Hash Migration...')
    const { backupName, count } = await runMigration(db)
    console.log(`✅ Migration executed on ${count} records. Backup created: ${backupName}`)

    // 3. Verify Plaintext is Gone from active records
    console.log('\n[Step 3] Verifying Plaintext Removal from Active Collection...')
    const remainingPlaintext = await db.collection('licenses').countDocuments({ productKey: { $exists: true } })
    assert.strictEqual(remainingPlaintext, 0, 'Plaintext productKey MUST be 0 in active collection')
    console.log('  ✅ Confirmed: 0 active records contain plaintext productKey.')

    // 4. Verify All 20 Can Be Found By Hash
    console.log('\n[Step 4] Verifying 100% Hash Lookup & Masked Format...')
    for (const legacy of seedLicenses) {
      const hash = hashSecretKey(legacy.productKey)
      const found = await db.collection('licenses').findOne({ productKeyHash: hash })
      assert(found, `Must find record by hash: ${hash}`)
      assert(found.productKeyMasked.includes('****'), 'Masked key format must be present')
      assert.strictEqual(found.productKey, undefined, 'Plaintext must not be present in document')
    }
    console.log('  ✅ 100% of records verified by hash. Masking confirmed.')

    // 5. Test Repeatability (Idempotency)
    console.log('\n[Step 5] Testing Migration Re-run (Idempotency)...')
    const rerun = await runMigration(db)
    assert.strictEqual(rerun.count, 20)
    const afterRerun = await db.collection('licenses').countDocuments({ productKeyHash: { $exists: true } })
    assert.strictEqual(afterRerun, 20, 'Index and hashes remain consistent on repeat')
    console.log('  ✅ Confirmed: Migration is safe and idempotent.')

    // 6. Test Rollback Procedure
    console.log('\n[Step 6] Testing Rollback from Backup Collection...')
    const backupDocs = await db.collection(backupName).find({}).toArray()
    assert.strictEqual(backupDocs.length, 20, 'Backup must contain all 20 original records')

    // Simulate rollback by restoring backup collection to active
    await db.collection('licenses').drop()
    await db.collection('licenses').insertMany(backupDocs)

    const rolledBackCount = await db.collection('licenses').countDocuments({ productKey: { $exists: true } })
    assert.strictEqual(rolledBackCount, 20, 'Rollback must restore original plaintext state')
    console.log('  ✅ Rollback verified: All 20 original records successfully restored.')

    // 7. Cleanup sandbox
    console.log('\n[Step 7] Dropping Sandbox Test Database...')
    await db.dropDatabase()
    console.log('  ✅ Sandbox test database dropped cleanly.')

    console.log('\n🎉 ALL ISOLATED MIGRATION & ROLLBACK TESTS PASSED 100%!')
  } finally {
    await mongoose.disconnect()
  }
}

runSandboxTest().catch((err) => {
  console.error('❌ Sandbox Test Failed:', err)
  process.exit(1)
})
