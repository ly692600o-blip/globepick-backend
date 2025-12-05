const express = require('express');
const LegalAgreement = require('../models/LegalAgreement');
const auth = require('../middleware/auth');
const { getClientIP } = require('../utils/ipLocation');
const router = express.Router();

// 记录法律确认
router.post('/', auth, async (req, res) => {
  try {
    const { 
      agreementType, 
      productId, 
      orderId, 
      version, 
      agreedAt, 
      agreedIP,
      userAgent 
    } = req.body;
    
    if (!agreementType || !version) {
      return res.status(400).json({ error: '确认类型和版本号不能为空' });
    }
    
    const clientIP = getClientIP(req);
    
    const agreement = new LegalAgreement({
      userId: req.userId,
      agreementType,
      productId: productId || null,
      orderId: orderId || null,
      version,
      agreedAt: agreedAt ? new Date(agreedAt) : new Date(),
      agreedIP: agreedIP || clientIP,
      userAgent: userAgent || req.get('user-agent')
    });
    
    await agreement.save();
    
    res.status(201).json({
      message: '法律确认记录成功',
      agreement
    });
  } catch (error) {
    res.status(500).json({ error: '记录法律确认失败', details: error.message });
  }
});

// 获取用户的法律确认记录
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (req.params.userId !== req.userId) {
      return res.status(403).json({ error: '无权查看他人的确认记录' });
    }
    
    const agreements = await LegalAgreement.find({ userId: req.params.userId })
      .sort({ agreedAt: -1 })
      .populate('productId', 'title')
      .populate('orderId', 'productTitle');
    
    res.json(agreements);
  } catch (error) {
    res.status(500).json({ error: '获取确认记录失败', details: error.message });
  }
});

module.exports = router;




