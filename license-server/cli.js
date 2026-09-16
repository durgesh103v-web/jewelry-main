#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const { License } = require('./models/License')
const { generateFormattedProductKey } = require('./crypto')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery_erp_licensing'

async function connectDB() {
  await mongoose.connect(MONGODB_URI)
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === 'help') {
    console.log(`
💎 Jewellery ERP - License Server CLI

Usage:
  node cli.js create <BASIC|PROFESSIONAL|ENTERPRISE> [customerName] [firmName] [validityDays]
  node cli.js list
  node cli.js revoke <productKey>
  node cli.js reset <productKey>
  node cli.js help

Examples:
  node cli.js create ENTERPRISE "Kalyan Jewellers" "Kalyan Main Branch" 365
  node cli.js list
  node cli.js reset JERP-ENT-8N3V-19YB-QM4Z
`)
    process.exit(0)
  }

  await connectDB()

  try {
    if (command === 'create') {
      const edition = (args[1] || 'PROFESSIONAL').toUpperCase()
      const customerName = args[2] || 'Authorized Customer'
      const firmName = args[3] || 'Jewellery Showroom'
      const validityDays = args[4] ? parseInt(args[4], 10) : null

      const productKey = generateFormattedProductKey(edition)
      let expiresAt = null
      if (validityDays) {
        expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + validityDays)
      }

      const license = new License({
        productKey,
        edition,
        customerName,
        firmName,
        status: 'AVAILABLE',
        expiresAt
      })

      await license.save()
      console.log('\n✨ New License Created Successfully in MongoDB!')
      console.log('----------------------------------------------------')
      console.log(`🔑 Product Key  : ${license.productKey}`)
      console.log(`🏷️  Edition      : ${license.edition}`)
      console.log(`👤 Customer     : ${license.customerName}`)
      console.log(`🏢 Firm Name    : ${license.firmName}`)
      console.log(`⏳ Expiration   : ${license.expiresAt ? license.expiresAt.toISOString().split('T')[0] : 'PERPETUAL (Lifetime)'}`)
      console.log(`📌 Status       : ${license.status}`)
      console.log('----------------------------------------------------\n')
    } else if (command === 'list') {
      const licenses = await License.find().sort({ createdAt: -1 })
      console.log(`\n📋 Total Licenses Found in MongoDB: ${licenses.length}\n`)
      console.table(
        licenses.map((l) => ({
          'Product Key': l.productKey,
          Edition: l.edition,
          Customer: l.customerName || '-',
          Status: l.status,
          'Bound Machine ID': l.boundMachineId || '(Unbound / Available)',
          'Expires At': l.expiresAt ? l.expiresAt.toISOString().split('T')[0] : 'PERPETUAL'
        }))
      )
    } else if (command === 'revoke') {
      const productKey = args[1]
      if (!productKey) {
        console.error('❌ Please provide the product key to revoke.')
        process.exit(1)
      }
      const updated = await License.findOneAndUpdate(
        { productKey: productKey.trim().toUpperCase() },
        { status: 'REVOKED' },
        { new: true }
      )
      if (updated) {
        console.log(`🚫 License ${updated.productKey} is now REVOKED.`)
      } else {
        console.log(`❌ License ${productKey} not found.`)
      }
    } else if (command === 'reset') {
      const productKey = args[1]
      if (!productKey) {
        console.error('❌ Please provide the product key to reset machine binding.')
        process.exit(1)
      }
      const updated = await License.findOneAndUpdate(
        { productKey: productKey.trim().toUpperCase() },
        { boundMachineId: null, status: 'AVAILABLE' },
        { new: true }
      )
      if (updated) {
        console.log(`🔄 License ${updated.productKey} machine binding has been RESET.`)
      } else {
        console.log(`❌ License ${productKey} not found.`)
      }
    } else {
      console.log(`❌ Unknown command: ${command}. Use "node cli.js help" for usage.`)
    }
  } catch (err) {
    console.error('❌ Error executing command:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

main()
