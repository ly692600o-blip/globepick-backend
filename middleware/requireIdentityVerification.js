const User = require('../models/User');

/**
 * 实名认证检查中间件
 * 确保用户必须完成实名认证才能进行某些操作（发布、购买等）
 */
const requireIdentityVerification = async (req, res, next) => {
  try {
    // 获取用户信息（auth 中间件已经设置了 req.user）
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 检查是否已完成实名认证（只需首次认证，之后一直有效）
    if (!user.isIdentityVerified || user.identityVerificationStatus !== 'approved') {
      return res.status(403).json({ 
        error: '请先完成实名认证',
        code: 'IDENTITY_VERIFICATION_REQUIRED',
        message: '首次使用需要完成实名认证，认证成功后即可使用所有功能，无需重复认证'
      });
    }
    
    // 实名认证通过，继续执行
    next();
  } catch (error) {
    console.error('实名认证检查失败:', error);
    res.status(500).json({ error: '实名认证检查失败', details: error.message });
  }
};

module.exports = requireIdentityVerification;

