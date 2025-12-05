const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatarURL: {
    type: String,
    default: null
  },
  backgroundImageURL: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 200,
    default: ''
  },
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  notesCount: {
    type: Number,
    default: 0
  },
  likedCount: {
    type: Number,
    default: 0
  },
  // 实名认证相关字段
  isIdentityVerified: {
    type: Boolean,
    default: false
  },
  identityVerificationStatus: {
    type: String,
    enum: ['not_verified', 'pending', 'approved', 'rejected'],
    default: 'not_verified'
  },
  identityVerificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IdentityVerification',
    default: null
  },
  // IP属地（系统自动更新，用户不能关闭）
  ipLocation: {
    type: String,
    default: null
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 转换为 JSON 时移除密码
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);



