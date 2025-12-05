const express = require('express');
const Comment = require('../models/Comment');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const { getClientIP, getIPLocation } = require('../utils/ipLocation');
const router = express.Router();

// 获取笔记的评论列表
router.get('/note/:noteId', async (req, res) => {
  try {
    const comments = await Comment.find({
      noteId: req.params.noteId,
      parentCommentId: null // 只获取顶级评论
    })
    .sort({ createdAt: 1 })
    .populate('userId', 'username avatarURL');
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: '获取评论失败', details: error.message });
  }
});

// 添加评论
router.post('/', auth, async (req, res) => {
  try {
    const { noteId, content, parentCommentId } = req.body;
    
    if (!noteId || !content) {
      return res.status(400).json({ error: '笔记ID和评论内容不能为空' });
    }
    
    // 获取用户信息
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 检查笔记是否存在
    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    // 获取用户IP属地
    const clientIP = getClientIP(req);
    const ipLocation = await getIPLocation(clientIP);
    
    // 创建评论
    const comment = new Comment({
      noteId,
      userId: req.userId,
      username: user.username,
      userAvatarURL: user.avatarURL,
      content,
      ipLocation: ipLocation || null,
      parentCommentId: parentCommentId || null
    });
    
    await comment.save();
    
    // 更新笔记评论数
    await Note.findByIdAndUpdate(noteId, {
      $inc: { commentsCount: 1 }
    });
    
    // 如果是回复，更新父评论的回复数
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $inc: { repliesCount: 1 }
      });
    }
    
    res.status(201).json({
      message: '评论成功',
      comment
    });
  } catch (error) {
    res.status(500).json({ error: '添加评论失败', details: error.message });
  }
});

module.exports = router;

