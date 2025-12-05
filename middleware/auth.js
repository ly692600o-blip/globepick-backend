const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT 认证中间件
const auth = async (req, res, next) => {
  try {
    // 从请求头获取 token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证 token' });
    }
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 查找用户
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    req.userId = user._id.toString();
    
    next();
  } catch (error) {
    res.status(401).json({ error: '认证失败', details: error.message });
  }
};

module.exports = auth;




