const mongoose = require('mongoose')

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
    productKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    edition: {
      type: String,
      enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'],
      required: true,
      default: 'PROFESSIONAL'
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
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
      type: String
    }
  },
  {
    timestamps: true
  }
)

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

const License = mongoose.model('License', LicenseSchema)

module.exports = {
  License,
  EDITION_FEATURES
}
