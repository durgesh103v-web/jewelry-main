const mongoose = require('mongoose')

const AdminUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN'],
      default: 'SUPER_ADMIN'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'LOCKED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockedUntil: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    lastLoginIp: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
)

// Ensure passwordHash is never leaked in JSON outputs
AdminUserSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.__v
  return obj
}

const AdminUser = mongoose.model('AdminUser', AdminUserSchema)

module.exports = { AdminUser }
