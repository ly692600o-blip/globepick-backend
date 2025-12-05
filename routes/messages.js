const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const router = express.Router();

// 获取会话的消息列表
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('senderId', 'username avatarURL')
      .populate('receiverId', 'username avatarURL');
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: '获取消息列表失败', details: error.message });
  }
});

// 发送消息
router.post('/', auth, async (req, res) => {
  try {
    const { conversationId, receiverId, content, messageType, imageURL } = req.body;
    const senderId = req.userId;
    
    if (!conversationId || !receiverId || !content) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    // 创建消息
    const message = new Message({
      conversationId,
      senderId,
      receiverId,
      content,
      messageType: messageType || 'text',
      imageURL: imageURL || null
    });
    
    await message.save();
    
    // 更新会话的最后消息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content,
      lastMessageTime: new Date(),
      $inc: { unreadCount: 1 }
    });
    
    // 填充用户信息
    await message.populate('senderId', 'username avatarURL');
    
    res.status(201).json({
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    res.status(500).json({ error: '发送消息失败', details: error.message });
  }
});

// 标记消息为已读
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    await Message.findByIdAndUpdate(messageId, {
      isRead: true
    });
    
    res.json({ message: '消息已标记为已读' });
  } catch (error) {
    res.status(500).json({ error: '标记消息失败', details: error.message });
  }
});

module.exports = router;

