const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const dns = require('dns')
dns.setServers(['8.8.8.8', '1.1.1.1'])
const mongoose = require('mongoose')
const { AdminUser } = require('./models/AdminUser')
const { hashPassword } = require('./services/credential.service')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery_erp_licensing'

async function seedAdmin() {
  const username = process.argv[2] || process.env.INITIAL_ADMIN_USERNAME || 'superadmin'
  const email = process.argv[3] || process.env.INITIAL_ADMIN_EMAIL || 'admin@jewelleryerp.com'
  const password = process.argv[4] || process.env.INITIAL_ADMIN_PASSWORD || 'Admin@Jewellery2026'

  console.log('--- Initial Super Admin Provisioning ---')
  console.log(`Connecting to MongoDB: ${MONGODB_URI}`)
  await mongoose.connect(MONGODB_URI)

  const existing = await AdminUser.findOne({
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
  })

  if (existing) {
    console.log(`ℹ️ Admin user already exists: ${existing.username} (${existing.email})`)
    console.log('No modifications made.')
    await mongoose.disconnect()
    return
  }

  const passwordHash = await hashPassword(password)
  const admin = new AdminUser({
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE'
  })

  await admin.save()
  console.log('✅ Initial Super Admin created successfully!')
  console.log(`👤 Username : ${admin.username}`)
  console.log(`📧 Email    : ${admin.email}`)
  console.log(`🛡️ Role     : ${admin.role}`)
  console.log('----------------------------------------')
  console.log('Please change the default password after first login.')

  await mongoose.disconnect()
}

seedAdmin().catch((err) => {
  console.error('❌ Error provisioning initial admin:', err.message)
  process.exit(1)
})
