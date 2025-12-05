const express = require('express');
const Collection = require('../models/Collection');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const router = express.Router();

// 收藏笔记
router.post('/note/:noteId', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.userId;
    
    // 检查是否已经收藏
    const existingCollection = await Collection.findOne({ noteId, userId });
    if (existingCollection) {
      return res.status(400).json({ error: '已经收藏过了' });
    }
    
    // 创建收藏记录
    const collection = new Collection({ noteId, userId });
    await collection.save();
    
    // 更新笔记收藏数
    await Note.findByIdAndUpdate(noteId, {
      $inc: { collectionsCount: 1 }
    });
    
    res.json({ message: '收藏成功' });
  } catch (error) {
    res.status(500).json({ error: '收藏失败', details: error.message });
  }
});

// 取消收藏
router.delete('/note/:noteId', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.userId;
    
    // 删除收藏记录
    const result = await Collection.findOneAndDelete({ noteId, userId });
    if (!result) {
      return res.status(404).json({ error: '未找到收藏记录' });
    }
    
    // 更新笔记收藏数
    await Note.findByIdAndUpdate(noteId, {
      $inc: { collectionsCount: -1 }
    });
    
    res.json({ message: '取消收藏成功' });
  } catch (error) {
    res.status(500).json({ error: '取消收藏失败', details: error.message });
  }
});

// 检查是否已收藏
router.get('/note/:noteId/check', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.userId;
    
    const collection = await Collection.findOne({ noteId, userId });
    res.json({ isCollected: !!collection });
  } catch (error) {
    res.status(500).json({ error: '检查收藏状态失败', details: error.message });
  }
});

module.exports = router;




