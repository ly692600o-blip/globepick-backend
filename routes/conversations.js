const express = require('express');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// 获取或创建会话
router.post('/get-or-create', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.userId;
    
    if (!participantId || participantId === userId) {
      return res.status(400).json({ error: '无效的参与者ID' });
    }
    
    // 查找现有会话
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] }
    }).populate('participants', 'username avatarURL');
    
    // 如果没有，创建新会话
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, participantId]
      });
      await conversation.save();
      await conversation.populate('participants', 'username avatarURL');
    }
    
    // 获取对方用户信息
    const otherUser = conversation.participants.find(
      p => p._id.toString() !== userId
    );
    
    res.json({
      conversationId: conversation._id,
      otherUser: {
        id: otherUser._id,
        username: otherUser.username,
        avatarURL: otherUser.avatarURL
      },
      lastMessage: conversation.lastMessage,
      lastMessageTime: conversation.lastMessageTime
    });
  } catch (error) {
    res.status(500).json({ error: '获取或创建会话失败', details: error.message });
  }
});

// 获取用户的会话列表
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const conversations = await Conversation.find({
      participants: userId
    })
    .sort({ lastMessageTime: -1 })
    .populate('participants', 'username avatarURL');
    
    // 格式化返回数据
    const formattedConversations = conversations.map(conv => {
      const otherUser = conv.participants.find(
        p => p._id.toString() !== userId
      );
      
      return {
        id: conv._id,
        otherUser: {
          id: otherUser._id,
          username: otherUser.username,
          avatarURL: otherUser.avatarURL
        },
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount
      };
    });
    
    res.json(formattedConversations);
  } catch (error) {
    res.status(500).json({ error: '获取会话列表失败', details: error.message });
  }
});

module.exports = router;




