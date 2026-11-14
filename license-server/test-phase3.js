const { generateOnboardingPdf } = require('./services/pdf.service')

async function testPdfGeneration() {
  console.log('Testing PDF Service generation...')
  
  const testPayload = {
    shopName: 'Kalyan Jewellers & Sons',
    shopId: 'JERP-TEST-9988',
    ownerName: 'Sunil Kalyan',
    username: 'owner_kalyan',
    temporaryPassword: 'TempPassword!2026',
    recoveryKey: 'A1B2-C3D4-E5F6-G7H8',
    productKey: 'JERP-PRO-9988-7766-5544',
    edition: 'ENTERPRISE',
    maxAllowedMachines: 1
  }

  const buffer = await generateOnboardingPdf(testPayload)
  
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty')
  }

  const header = buffer.toString('utf-8', 0, 5)
  console.log('PDF Header magic bytes:', header)
  if (header !== '%PDF-') {
    throw new Error(`Invalid PDF header: expected %PDF-, got ${header}`)
  }

  console.log(`✓ PDF successfully generated! File size: ${buffer.length} bytes`)
}

testPdfGeneration()
  .then(() => {
    console.log('Phase 3 PDF generation unit test PASSED')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 3 PDF test FAILED:', err)
    process.exit(1)
  })