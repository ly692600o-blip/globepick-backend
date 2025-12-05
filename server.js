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

// 连接 MongoDB - 异步连接，不阻塞服务器启动
// 这很重要：服务器必须先启动，然后才能连接MongoDB
// 这样Railway的健康检查能立即得到响应
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/globepick';

// 延迟连接MongoDB，确保服务器先启动
setTimeout(() => {
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
    // 即使MongoDB连接失败，服务器也继续运行
    // 这样健康检查端点仍然可以响应
  });
}, 100); // 延迟100ms，确保服务器先启动

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
// Railway会在服务启动后定期检查此端点
app.get('/health', (req, res) => {
  // 立即返回200，不等待MongoDB
  // 这确保Railway知道服务已启动并可以接收请求
  res.status(200).json({ 
    status: 'ok', 
    message: 'GlobePick API 运行正常',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 健康检查 - 更简单的版本（Railway可能检查这个）
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
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
  console.log(`✅ 健康检查端点（简化）: http://0.0.0.0:${PORT}/healthz`);
  console.log(`✅ 服务器已启动，可以接收请求（包括健康检查）`);
  
  // 立即测试健康检查端点，确保它能响应
  // 这有助于Railway检测服务状态
  const http = require('http');
  setTimeout(() => {
    const testReq = http.get(`http://localhost:${PORT}/health`, (testRes) => {
      if (testRes.statusCode === 200) {
        console.log('✅ 健康检查端点测试成功');
      }
    });
    testReq.on('error', () => {
      // 忽略测试错误，这只是内部测试
    });
  }, 500);
});

// 优雅关闭处理
// Mongoose 8.x 版本中，close() 方法不再接受回调，需要使用 Promise
const gracefulShutdown = async (signal) => {
  console.log(`收到 ${signal} 信号，正在关闭服务器...`);
  
  // 关闭HTTP服务器
  server.close(() => {
    console.log('服务器已关闭');
  });
  
  // 关闭MongoDB连接（Mongoose 8.x 使用 Promise）
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB 连接已关闭');
    }
  } catch (error) {
    console.error('关闭MongoDB连接时出错:', error);
  }
  
  // 退出进程
  process.exit(0);
};

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

module.exports = { app, io };

