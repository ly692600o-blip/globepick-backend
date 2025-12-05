const express = require('express');
const Follow = require('../models/Follow');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// 关注用户
router.post('/:followingId', auth, async (req, res) => {
  try {
    const followerId = req.userId;
    const { followingId } = req.params;
    
    if (followerId === followingId) {
      return res.status(400).json({ error: '不能关注自己' });
    }
    
    // 检查是否已经关注
    const existingFollow = await Follow.findOne({ followerId, followingId });
    if (existingFollow) {
      return res.status(400).json({ error: '已经关注过了' });
    }
    
    // 检查被关注用户是否存在
    const followingUser = await User.findById(followingId);
    if (!followingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 创建关注关系
    const follow = new Follow({ followerId, followingId });
    await follow.save();
    
    // 更新粉丝数和关注数
    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: 1 }
    });
    await User.findByIdAndUpdate(followingId, {
      $inc: { followersCount: 1 }
    });
    
    res.json({ message: '关注成功' });
  } catch (error) {
    res.status(500).json({ error: '关注失败', details: error.message });
  }
});

// 取消关注
router.delete('/:followingId', auth, async (req, res) => {
  try {
    const followerId = req.userId;
    const { followingId } = req.params;
    
    // 删除关注关系
    const result = await Follow.findOneAndDelete({ followerId, followingId });
    if (!result) {
      return res.status(404).json({ error: '未找到关注记录' });
    }
    
    // 更新粉丝数和关注数
    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: -1 }
    });
    await User.findByIdAndUpdate(followingId, {
      $inc: { followersCount: -1 }
    });
    
    res.json({ message: '取消关注成功' });
  } catch (error) {
    res.status(500).json({ error: '取消关注失败', details: error.message });
  }
});

// 检查是否已关注
router.get('/:followingId/check', auth, async (req, res) => {
  try {
    const followerId = req.userId;
    const { followingId } = req.params;
    
    const follow = await Follow.findOne({ followerId, followingId });
    res.json({ isFollowing: !!follow });
  } catch (error) {
    res.status(500).json({ error: '检查关注状态失败', details: error.message });
  }
});

// 获取关注列表
router.get('/following/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取该用户关注的所有用户ID
    const follows = await Follow.find({ followerId: userId }).populate('followingId', 'username avatarURL bio ipLocation');
    
    const following = follows.map(follow => {
      const user = follow.followingId;
      return {
        _id: user._id.toString(),
        username: user.username,
        avatarURL: user.avatarURL,
        bio: user.bio,
        ipLocation: user.ipLocation
      };
    });
    
    res.json(following);
  } catch (error) {
    res.status(500).json({ error: '获取关注列表失败', details: error.message });
  }
});

// 获取粉丝列表
router.get('/followers/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取关注该用户的所有用户ID
    const follows = await Follow.find({ followingId: userId }).populate('followerId', 'username avatarURL bio ipLocation');
    
    const followers = follows.map(follow => {
      const user = follow.followerId;
      return {
        _id: user._id.toString(),
        username: user.username,
        avatarURL: user.avatarURL,
        bio: user.bio,
        ipLocation: user.ipLocation
      };
    });
    
    res.json(followers);
  } catch (error) {
    res.status(500).json({ error: '获取粉丝列表失败', details: error.message });
  }
});

module.exports = router;




