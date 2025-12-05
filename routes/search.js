const express = require('express');
const Note = require('../models/Note');
const User = require('../models/User');
const router = express.Router();

// 搜索笔记
router.get('/notes', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ error: '请输入搜索关键词' });
    }
    
    // 使用文本搜索（需要创建文本索引）
    const notes = await Note.find({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'username avatarURL');
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: '搜索笔记失败', details: error.message });
  }
});

// 搜索用户
router.get('/users', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ error: '请输入搜索关键词' });
    }
    
    const users = await User.find({
      username: { $regex: keyword, $options: 'i' }
    })
    .select('-password')
    .limit(20);
    
    res.json(users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      avatarURL: user.avatarURL,
      bio: user.bio,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      notesCount: user.notesCount,
      likedCount: user.likedCount
    })));
  } catch (error) {
    res.status(500).json({ error: '搜索用户失败', details: error.message });
  }
});

module.exports = router;




