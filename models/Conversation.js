const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 确保参与者只有两个用户
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('会话必须有且只有两个参与者'));
  }
  next();
});

// 索引
conversationSchema.index({ participants: 1, lastMessageTime: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);




