const express = require('express');
const Note = require('../models/Note');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getClientIP, getIPLocation } = require('../utils/ipLocation');
const router = express.Router();

// 获取笔记列表（分页）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // 优化：并行执行查询和计数，使用select限制字段，移除不必要的populate
    // Note模型已经存储了username和userAvatarURL，不需要populate
    const [notes, total] = await Promise.all([
      Note.find()
        .select('userId username userAvatarURL title content images videoURL location ipLocation likesCount commentsCount collectionsCount aspectRatio createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // 使用lean()提高性能，返回普通JS对象
      Note.countDocuments()
    ]);
    
    res.json({
      notes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取笔记列表失败', details: error.message });
  }
});

// 创建笔记
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, images, location, aspectRatio } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    
    // 获取用户信息
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取用户IP属地
    const clientIP = getClientIP(req);
    const ipLocation = await getIPLocation(clientIP);
    
    // 创建笔记
    const note = new Note({
      userId: req.userId,
      username: user.username,
      userAvatarURL: user.avatarURL,
      title,
      content: content || '',
      images: images || [],
      location: location || null,
      ipLocation: ipLocation || null,
      aspectRatio: aspectRatio || 1.0
    });
    
    await note.save();
    
    // 更新用户笔记数
    await User.findByIdAndUpdate(req.userId, {
      $inc: { notesCount: 1 }
    });
    
    res.status(201).json({
      message: '笔记创建成功',
      note
    });
  } catch (error) {
    res.status(500).json({ error: '创建笔记失败', details: error.message });
  }
});

// 获取笔记详情
router.get('/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    
    // 检查是否是mock数据ID（格式为 mock_note_*）
    // 如果是mock数据，直接返回404，让前端使用本地数据
    if (noteId.startsWith('mock_')) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    // 检查ID格式是否为有效的MongoDB ObjectId（24位十六进制字符串）
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    const note = await Note.findById(noteId)
      .populate('userId', 'username avatarURL bio');
    
    if (!note) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    res.json(note);
  } catch (error) {
    // 如果是ObjectId转换错误，返回404而不是500
    if (error.message && error.message.includes('Cast to ObjectId')) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    res.status(500).json({ error: '获取笔记详情失败', details: error.message });
  }
});

// 获取用户的笔记
router.get('/user/:userId', async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatarURL');
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: '获取用户笔记失败', details: error.message });
  }
});

// 删除笔记
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    // 检查是否是笔记作者
    if (note.userId.toString() !== req.userId) {
      return res.status(403).json({ error: '无权删除此笔记' });
    }
    
    await Note.findByIdAndDelete(req.params.id);
    
    // 更新用户笔记数
    await User.findByIdAndUpdate(req.userId, {
      $inc: { notesCount: -1 }
    });
    
    res.json({ message: '笔记删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除笔记失败', details: error.message });
  }
});

module.exports = router;

