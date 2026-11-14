const PDFDocument = require('pdfkit')

/**
 * Generates an official, high-quality Customer Onboarding Document as a PDF buffer.
 *
 * ONLY generated dynamically during one-time initial issuance or controlled credential rotation.
 * Plaintext secrets are supplied in-memory from the creation response and are never stored.
 */
function generateOnboardingPdf(params) {
  const {
    shopName,
    shopId,
    ownerName,
    username,
    temporaryPassword,
    recoveryKey,
    productKey,
    edition,
    maxAllowedMachines = 1,
    issuedAt = new Date().toISOString()
  } = params

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Jewellery ERP Onboarding - ${shopName}`,
          Author: 'Jewellery ERP Super Admin',
          Subject: 'Commercial Showroom Activation & Credentials'
        }
      })

      const buffers = []
      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err) => reject(err))

      // Primary Palette
      const darkColor = '#0f172a'
      const goldColor = '#d97706'
      const slateColor = '#64748b'
      const cardBg = '#f8fafc'
      const borderColor = '#e2e8f0'

      // Header Banner
      doc.rect(50, 50, 495, 75).fillAndStroke('#fffbeb', '#fde68a')
      
      doc.fillColor(goldColor).fontSize(10).font('Helvetica-Bold')
        .text('JEWELLERY ERP — COMMERCIAL LICENSING CERTIFICATE', 65, 65)

      doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold')
        .text('Showroom Onboarding & Credentials', 65, 80)

      doc.fillColor(slateColor).fontSize(9).font('Helvetica')
        .text(`Issued On: ${new Date(issuedAt).toLocaleDateString()} | Node Identifier: ${shopId}`, 65, 102)

      doc.moveDown(3)

      // Confidentiality Notice
      doc.rect(50, 140, 495, 45).fillAndStroke('#fef2f2', '#fecaca')
      doc.fillColor('#991b1b').fontSize(9).font('Helvetica-Bold')
        .text('CONFIDENTIAL SECURITY ADVISORY', 65, 148)
      doc.fillColor('#b91c1c').fontSize(8).font('Helvetica')
        .text(
          'This document contains sensitive master credentials. The temporary password must be changed immediately on first terminal login. Keep the Master Recovery Key in a secure offline safe.',
          65,
          160,
          { width: 465 }
        )

      // Section 1: Showroom Profile
      let y = 200
      doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('1. Showroom Profile', 50, y)
      y += 18

      doc.rect(50, y, 495, 65).fillAndStroke(cardBg, borderColor)
      doc.fillColor(slateColor).fontSize(8).font('Helvetica')
        .text('SHOWROOM NAME', 65, y + 12)
        .text('SHOP ID', 230, y + 12)
        .text('OWNER NAME', 370, y + 12)

      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold')
        .text(shopName, 65, y + 25, { width: 155 })
        .text(shopId, 230, y + 25)
        .text(ownerName, 370, y + 25, { width: 160 })

      doc.fillColor(slateColor).fontSize(8).font('Helvetica')
        .text('EDITION', 65, y + 42)
        .text('DEVICE LIMIT', 230, y + 42)

      doc.fillColor(goldColor).fontSize(10).font('Helvetica-Bold')
        .text(`${edition} SUITE`, 65, y + 52)
        .text(`${maxAllowedMachines} Workstation Terminal`, 230, y + 52)

      // Section 2: Master Access Credentials
      y += 85
      doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('2. Master Terminal Credentials', 50, y)
      y += 18

      doc.rect(50, y, 495, 95).fillAndStroke(cardBg, borderColor)

      doc.fillColor(slateColor).fontSize(8).font('Helvetica')
        .text('MASTER ADMIN USERNAME', 65, y + 12)
        .text('TEMPORARY PASSWORD (CHANGE ON FIRST LOGIN)', 230, y + 12)

      doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold')
        .text(username, 65, y + 25)
        .text(temporaryPassword, 230, y + 25)

      doc.fillColor(slateColor).fontSize(8).font('Helvetica')
        .text('PRODUCT LICENSE KEY', 65, y + 48)
        .text('MASTER RECOVERY KEY (FOR PASSWORD RESET ONLY)', 230, y + 48)

      doc.fillColor('#0284c7').fontSize(11).font('Courier-Bold')
        .text(productKey, 65, y + 62)
      doc.fillColor('#059669').fontSize(11).font('Courier-Bold')
        .text(recoveryKey, 230, y + 62)

      doc.fillColor(slateColor).fontSize(7.5).font('Helvetica')
        .text('Hardware-locked to first activated PC', 65, y + 78)
        .text('Store in safe; never share with staff', 230, y + 78)

      // Section 3: Activation & Provisioning Instructions
      y += 115
      doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('3. Setup & Activation Guide', 50, y)
      y += 18

      const steps = [
        'Step 1: Install and launch Jewellery ERP Desktop application on the primary showroom PC.',
        'Step 2: On the Activation Screen, input the Product License Key above to bind your device.',
        'Step 3: On the Terminal Login screen, sign in with your Username and Temporary Password.',
        'Step 4: Update your password immediately. The software is now 100% offline operational.'
      ]

      steps.forEach((step, idx) => {
        doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text(`•`, 65, y + (idx * 20))
        doc.fillColor(darkColor).fontSize(9).font('Helvetica').text(step, 80, y + (idx * 20), { width: 450 })
      })

      // Footer
      doc.fontSize(8).fillColor(slateColor).font('Helvetica')
        .text(
          'Jewellery ERP Enterprise Licensing Authority • Cryptographically Protected with Ed25519 & Argon2id',
          50,
          750,
          { align: 'center', width: 495 }
        )

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = { generateOnboardingPdf }
