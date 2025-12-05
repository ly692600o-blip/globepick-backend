const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// 生成 JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 位' });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }
    
    // 创建用户
    const user = new User({
      username,
      email,
      password
    });
    
    await user.save();
    
    // 生成 token
    const token = generateToken(user._id);
    
    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatarURL: user.avatarURL,
        backgroundImageURL: user.backgroundImageURL || null,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        notesCount: user.notesCount,
        likedCount: user.likedCount,
        ipLocation: user.ipLocation || null
      }
    });
  } catch (error) {
    console.error('❌ 注册错误:', error);
    console.error('错误堆栈:', error.stack);
    
    // 处理验证错误，返回友好的错误信息
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: errors[0] || '数据验证失败',
        details: errors.join(', ')
      });
    }
    
    res.status(500).json({ 
      error: '注册失败', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }
    
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 生成 token
    const token = generateToken(user._id);
    
    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatarURL: user.avatarURL,
        backgroundImageURL: user.backgroundImageURL || null,
        bio: user.bio,
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        notesCount: user.notesCount || 0,
        likedCount: user.likedCount || 0,
        ipLocation: user.ipLocation || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: '登录失败', details: error.message });
  }
});

module.exports = router;

