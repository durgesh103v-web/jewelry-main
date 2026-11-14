const mongoose = require('mongoose')

const ShopSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    shopName: {
      type: String,
      required: true,
      trim: true
    },
    ownerName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    businessType: {
      type: String,
      enum: ['WHOLESALE', 'RETAIL'],
      required: true,
      default: 'WHOLESALE'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true
    },
    edition: {
      type: String,
      enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'],
      default: 'PROFESSIONAL'
    },
    maxAllowedMachines: {
      type: Number,
      default: 1,
      min: 1
    },
    ownerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OwnerAccount',
      default: null
    },
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License',
      default: null
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

ShopSchema.index({ status: 1, createdAt: -1 })
ShopSchema.index({ shopName: 'text', ownerName: 'text', phone: 'text' })

const Shop = mongoose.model('Shop', ShopSchema)

module.exports = { Shop }
