const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  userAvatarURL: {
    type: String,
    default: null
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    maxlength: 5000
  },
  images: [{
    type: String // 图片 URL 或 GridFS ID
  }],
  videoURL: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  ipLocation: {
    type: String,
    default: null
  },
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  collectionsCount: {
    type: Number,
    default: 0
  },
  aspectRatio: {
    type: Number,
    default: 1.0
  }
}, {
  timestamps: true
});

// 索引
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ title: 'text', content: 'text' }); // 文本搜索索引

module.exports = mongoose.model('Note', noteSchema);

