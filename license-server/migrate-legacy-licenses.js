require('dotenv').config()
const mongoose = require('mongoose')
const { hashSecretKey } = require('./services/credential.service')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery_erp_licensing'

/**
 * MIGRATION SCRIPT: migrate-legacy-licenses.js
 *
 * PURPOSE:
 * Computes `productKeyHash` and `productKeyMasked` for all existing licenses in MongoDB.
 * Keeps `productKey` intact temporarily until verification is confirmed.
 *
 * SAFETY:
 * Non-destructive. Backs up affected records in a rollback collection before applying.
 */
async function migrate() {
  console.log('=== STARTING SAFE LICENSE HASH MIGRATION ===')
  console.log('Target MongoDB URI:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@'))
  await mongoose.connect(MONGODB_URI)

  const db = mongoose.connection.db
  const licensesCollection = db.collection('licenses')

  // 1. Create a timestamped backup collection for rollback safety
  const backupCollectionName = `licenses_backup_${Date.now()}`
  console.log(`Step 1: Creating backup collection [${backupCollectionName}]...`)
  const allLicenses = await licensesCollection.find({}).toArray()

  if (allLicenses.length > 0) {
    await db.collection(backupCollectionName).insertMany(allLicenses)
    console.log(`✅ Backed up ${allLicenses.length} license records.`)
  } else {
    console.log('No licenses found to migrate.')
    await mongoose.disconnect()
    return
  }

  // 2. Perform safe migration
  console.log('Step 2: Calculating SHA-256 hashes and masks...')
  let migratedCount = 0
  let alreadyHashedCount = 0

  for (const doc of allLicenses) {
    if (!doc.productKey) continue

    const normalizedKey = doc.productKey.trim().toUpperCase()
    const productKeyHash = hashSecretKey(normalizedKey)

    // Calculate masked representation
    const parts = normalizedKey.split('-')
    const productKeyMasked = parts.length >= 5
      ? `${parts[0]}-${parts[1]}-****-****-${parts[4]}`
      : '****-****-****'

    if (doc.productKeyHash === productKeyHash) {
      alreadyHashedCount++
      continue
    }

    await licensesCollection.updateOne(
      { _id: doc._id },
      {
        $set: {
          productKeyHash,
          productKeyMasked,
          updatedAt: new Date()
        }
      }
    )
    migratedCount++
  }

  console.log(`✅ Migration complete: ${migratedCount} updated, ${alreadyHashedCount} already migrated.`)

  // 3. Ensure unique sparse index on productKeyHash
  console.log('Step 3: Ensuring index on productKeyHash...')
  await licensesCollection.createIndex({ productKeyHash: 1 }, { unique: true, sparse: true })
  console.log('✅ Unique sparse index created on productKeyHash.')

  // 4. Verify that each license can be retrieved by hash
  console.log('Step 4: Verification test on all records...')
  for (const doc of allLicenses) {
    if (!doc.productKey) continue
    const keyHash = hashSecretKey(doc.productKey)
    const verified = await licensesCollection.findOne({ productKeyHash: keyHash })
    if (!verified) {
      throw new Error(`CRITICAL VERIFICATION FAILED: License ${doc._id} could not be retrieved by hash!`)
    }
  }
  console.log('✅ 100% of licenses successfully verified by hash.')
  console.log('=== MIGRATION FINISHED SUCCESSFULLY ===')

  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
