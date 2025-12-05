const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// 获取用户信息
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatarURL: user.avatarURL,
      backgroundImageURL: user.backgroundImageURL || null,
      bio: user.bio,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      notesCount: user.notesCount,
      likedCount: user.likedCount,
      createdAt: user.createdAt,
      ipLocation: user.ipLocation || null,
      isIdentityVerified: user.isIdentityVerified,
      identityVerificationStatus: user.identityVerificationStatus,
      identityVerificationId: user.identityVerificationId
    });
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败', details: error.message });
  }
});

// 更新用户信息
router.put('/:id', auth, async (req, res) => {
  try {
    // 检查是否是本人
    if (req.params.id !== req.userId) {
      return res.status(403).json({ error: '无权修改此用户信息' });
    }
    
    const { username, bio, avatarURL, backgroundImageURL, ipLocation } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarURL !== undefined) updateData.avatarURL = avatarURL;
    if (backgroundImageURL !== undefined) updateData.backgroundImageURL = backgroundImageURL;
    // IP属地可以由系统自动更新（用户不能手动关闭）
    if (ipLocation !== undefined) updateData.ipLocation = ipLocation;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.json({
      message: '用户信息更新成功',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarURL: user.avatarURL,
        bio: user.bio
      }
    });
  } catch (error) {
    res.status(500).json({ error: '更新用户信息失败', details: error.message });
  }
});

module.exports = router;




