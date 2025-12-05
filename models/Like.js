const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// 复合唯一索引，确保一个用户只能给一个笔记点赞一次
likeSchema.index({ noteId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);




