const mongoose = require('mongoose');

const identityVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  realName: {
    type: String,
    required: true,
    trim: true
  },
  idCardNumber: {
    type: String,
    required: true,
    trim: true
  },
  idCardFrontImage: {
    type: String, // 存储图片URL
    default: null
  },
  idCardBackImage: {
    type: String, // 存储图片URL
    default: null
  },
  status: {
    type: String,
    enum: ['not_verified', 'pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 索引（unique索引会同时创建唯一约束和索引）
identityVerificationSchema.index({ userId: 1 }, { unique: true });
identityVerificationSchema.index({ idCardNumber: 1 }, { unique: true });
identityVerificationSchema.index({ status: 1 });

module.exports = mongoose.model('IdentityVerification', identityVerificationSchema);

