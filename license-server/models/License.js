const mongoose = require('mongoose')
const { hashSecretKey } = require('../services/credential.service')

const EDITION_FEATURES = {
  BASIC: [
    'FEATURE_SALES',
    'FEATURE_PURCHASE',
    'FEATURE_INVENTORY',
    'FEATURE_ACCOUNTING',
    'FEATURE_REPORTS',
    'FEATURE_GST'
  ],
  PROFESSIONAL: [
    'FEATURE_SALES',
    'FEATURE_PURCHASE',
    'FEATURE_INVENTORY',
    'FEATURE_ACCOUNTING',
    'FEATURE_REPORTS',
    'FEATURE_GST',
    'FEATURE_BARCODE',
    'FEATURE_JOB_WORK',
    'FEATURE_APPROVALS',
    'FEATURE_ORDERS',
    'FEATURE_ADVANCED_REPORTS'
  ],
  ENTERPRISE: [
    'FEATURE_SALES',
    'FEATURE_PURCHASE',
    'FEATURE_INVENTORY',
    'FEATURE_ACCOUNTING',
    'FEATURE_REPORTS',
    'FEATURE_GST',
    'FEATURE_BARCODE',
    'FEATURE_JOB_WORK',
    'FEATURE_APPROVALS',
    'FEATURE_ORDERS',
    'FEATURE_ADVANCED_REPORTS',
    'FEATURE_CONSIGNMENT',
    'FEATURE_MANUFACTURING',
    'FEATURE_TAGGING_RFID'
  ]
}

const ActivationRecordSchema = new mongoose.Schema({
  machineId: { type: String, required: true },
  activatedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
  appVersion: { type: String }
})

const LicenseSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null,
      index: true
    },
    // New primary lookup hash: SHA-256 of uppercase product key
    productKeyHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    // Legacy productKey (retained optional for non-destructive backward compatibility)
    // For newly generated licenses, this is omitted or populated as empty/masked.
    productKey: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true
    },
    // Masked representation for safe Admin display (e.g. JERP-PRO-****-****-PL8Q)
    productKeyMasked: {
      type: String,
      default: ''
    },
    edition: {
      type: String,
      enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'],
      required: true,
      default: 'PROFESSIONAL'
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'ARCHIVED'],
      default: 'AVAILABLE',
      index: true
    },
    customerName: {
      type: String,
      trim: true
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    firmName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    boundMachineId: {
      type: String,
      default: null,
      index: true
    },
    maxAllowedMachines: {
      type: Number,
      default: 1
    },
    activations: [ActivationRecordSchema],
    activatedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null // null = Lifetime / Perpetual License
    },
    customFeatures: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

/**
 * Pre-save hook: Ensure productKeyHash is computed if productKey is present
 */
LicenseSchema.pre('save', function (next) {
  if (this.productKey && !this.productKeyHash) {
    this.productKeyHash = hashSecretKey(this.productKey)
  }
  if (this.productKey && !this.productKeyMasked) {
    const parts = this.productKey.split('-')
    if (parts.length >= 5) {
      this.productKeyMasked = `${parts[0]}-${parts[1]}-****-****-${parts[4]}`
    } else {
      this.productKeyMasked = '****-****-****'
    }
  }
  next()
})

/**
 * Helper method to retrieve full features list for this license
 */
LicenseSchema.methods.getAllFeatures = function () {
  const base = EDITION_FEATURES[this.edition] || []
  if (this.customFeatures && this.customFeatures.length > 0) {
    return Array.from(new Set([...base, ...this.customFeatures]))
  }
  return base
}

/**
 * Safe JSON output: ensure plaintext productKey is never serialized
 */
LicenseSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.productKey
  delete obj.__v
  return obj
}

const License = mongoose.model('License', LicenseSchema)

module.exports = {
  License,
  EDITION_FEATURES
}
