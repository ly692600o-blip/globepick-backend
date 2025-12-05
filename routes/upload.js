const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const router = express.Router();

// 配置 multer（内存存储）
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  }
});

// 上传图片（Base64 编码）
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未找到图片文件' });
    }
    
    // 将图片转换为 Base64
    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;
    
    // 存储图片到 MongoDB 的 images 集合（可选）
    // 或者直接返回 Base64，让客户端自己存储到笔记中
    
    res.json({
      message: '图片上传成功',
      imageUrl: imageUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: '图片上传失败', details: error.message });
  }
});

module.exports = router;

