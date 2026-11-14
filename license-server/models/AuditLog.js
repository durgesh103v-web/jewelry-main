const mongoose = require('mongoose')

const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
      index: true
    },
    adminUsername: {
      type: String,
      default: 'system',
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
      // e.g., 'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'SHOP_CREATE', 'SHOP_SUSPEND', 'SHOP_UPDATE', 'LICENSE_ACTIVATE', 'MACHINE_RESET'
    },
    targetType: {
      type: String,
      required: true,
      index: true
      // e.g., 'SHOP', 'OWNER_ACCOUNT', 'LICENSE', 'ADMIN_USER'
    },
    targetId: {
      type: String,
      default: null,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
)

// Index for audit history queries
AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ targetType: 1, targetId: 1 })

const AuditLog = mongoose.model('AuditLog', AuditLogSchema)

module.exports = { AuditLog }
