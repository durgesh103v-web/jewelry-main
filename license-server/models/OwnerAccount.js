const mongoose = require('mongoose')

const OwnerAccountSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true
    },
    shopIdentifier: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 60,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    recoveryKeyHash: {
      type: String,
      required: true,
      index: true
    },
    isTemporaryPassword: {
      type: Boolean,
      default: true
    },
    isProvisioned: {
      type: Boolean,
      default: false,
      index: true
    },
    provisionedAt: {
      type: Date,
      default: null
    },
    provisionedMachineId: {
      type: String,
      default: null
    },
    credentialVersion: {
      type: Number,
      default: 1
    },
    lastAcknowledgedVersion: {
      type: Number,
      default: 0
    },
    passwordVersion: {
      type: Number,
      default: 1
    },
    recoveryKeyVersion: {
      type: Number,
      default: 1
    },
    lastSyncAcknowledgedAt: {
      type: Date,
      default: null
    },
    lastPasswordChangeAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
)

OwnerAccountSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.recoveryKeyHash
  delete obj.__v
  return obj
}

const OwnerAccount = mongoose.model('OwnerAccount', OwnerAccountSchema)

module.exports = { OwnerAccount }
