const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  followingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// 复合唯一索引，确保一个用户只能关注另一个用户一次
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
// 防止用户关注自己
followSchema.pre('save', function(next) {
  if (this.followerId.toString() === this.followingId.toString()) {
    return next(new Error('不能关注自己'));
  }
  next();
});

module.exports = mongoose.model('Follow', followSchema);




