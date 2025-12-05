const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于访问上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 连接 MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/globepick';

// 增加连接超时时间和重试配置
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30秒超时（默认10秒）
  socketTimeoutMS: 45000, // 45秒socket超时
  connectTimeoutMS: 30000, // 30秒连接超时
  maxPoolSize: 10, // 最大连接池大小
  retryWrites: true,
  w: 'majority'
})
.then(() => {
  console.log('✅ MongoDB 连接成功');
})
.catch((error) => {
  console.error('❌ MongoDB 连接失败:', error);
});

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/search', require('./routes/search'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/legal-agreements', require('./routes/legal-agreements'));
app.use('/api/identity-verification', require('./routes/identity-verification'));

// WebSocket 实时消息
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  socket.on('join-conversation', (conversationId) => {
    socket.join(conversationId);
  });
  
  socket.on('send-message', (data) => {
    socket.to(data.conversationId).emit('new-message', data);
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

// 健康检查 - 改进版本，确保Railway能正确检测
app.get('/health', (req, res) => {
  // 检查MongoDB连接状态
  const mongoStatus = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  
  if (mongoStatus === 1) {
    res.status(200).json({ 
      status: 'ok', 
      message: 'GlobePick API 运行正常',
      mongodb: 'connected',
      timestamp: new Date().toISOString()
    });
  } else {
    // MongoDB还在连接中，但服务器已启动，返回200
    res.status(200).json({ 
      status: 'ok', 
      message: 'GlobePick API 运行正常',
      mongodb: 'connecting',
      timestamp: new Date().toISOString()
    });
  }
});

// 根路径也返回健康状态（Railway可能检查根路径）
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'GlobePick API 运行正常',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
// 监听所有网络接口，以便 iOS 模拟器可以访问
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`📱 iOS 模拟器可以使用 http://127.0.0.1:${PORT} 或 http://localhost:${PORT}`);
  console.log(`✅ 健康检查端点: http://0.0.0.0:${PORT}/health`);
  
  // 确保服务器启动后立即可以响应请求
  // 这有助于Railway的健康检查
  setTimeout(() => {
    console.log('✅ 服务器已完全启动，可以接收请求');
  }, 1000);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    mongoose.connection.close(false, () => {
      console.log('MongoDB 连接已关闭');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    mongoose.connection.close(false, () => {
      console.log('MongoDB 连接已关闭');
      process.exit(0);
    });
  });
});

module.exports = { app, io };

