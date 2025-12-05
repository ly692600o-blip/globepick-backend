const express = require('express');
const Like = require('../models/Like');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const router = express.Router();

// 点赞笔记
router.post('/note/:noteId', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.userId;
    
    // 检查是否已经点赞
    const existingLike = await Like.findOne({ noteId, userId });
    if (existingLike) {
      return res.status(400).json({ error: '已经点赞过了' });
    }
    
    // 创建点赞记录
    const like = new Like({ noteId, userId });
    await like.save();
    
    // 更新笔记点赞数
    await Note.findByIdAndUpdate(noteId, {
      $inc: { likesCount: 1 }
    });
    
    res.json({ message: '点赞成功' });
  } catch (error) {
    res.status(500).json({ error: '点赞失败', details: error.message });
  }
});

// 取消点赞
router.delete('/note/:noteId', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.userId;
    
    // 删除点赞记录
    const result = await Like.findOneAndDelete({ noteId, userId });
    if (!result) {
      return res.status(404).json({ error: '未找到点赞记录' });
    }
    
    // 更新笔记点赞数
    await Note.findByIdAndUpdate(noteId, {
      $inc: { likesCount: -1 }
    });
    
    res.json({ message: '取消点赞成功' });
  } catch (error) {
    res.status(500).json({ error: '取消点赞失败', details: error.message });
  }
});

// 检查是否已点赞
router.get('/note/:noteId/check', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.userId;
    
    const like = await Like.findOne({ noteId, userId });
    res.json({ isLiked: !!like });
  } catch (error) {
    res.status(500).json({ error: '检查点赞状态失败', details: error.message });
  }
});

module.exports = router;




