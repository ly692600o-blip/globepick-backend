const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IdentityVerification = require('../models/IdentityVerification');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/identity-verification/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG、JPG、PNG 格式的图片'));
    }
  }
});

// 获取用户的实名认证信息
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 确保用户只能查看自己的认证信息
    if (req.user.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const verification = await IdentityVerification.findOne({ userId });
    
    res.json({ verification });
  } catch (error) {
    console.error('获取实名认证信息失败:', error);
    res.status(500).json({ error: '获取实名认证信息失败' });
  }
});

// 提交实名认证申请
router.post('/submit', auth, upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { realName, idCardNumber, idCardFrontImageData, idCardBackImageData } = req.body;
    
    // 验证输入
    if (!realName || !idCardNumber) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    // 检查是否已经提交过认证
    const existingVerification = await IdentityVerification.findOne({ userId });
    if (existingVerification && existingVerification.status === 'pending') {
      return res.status(400).json({ error: '您已有待审核的认证申请' });
    }
    
    // 检查身份证号是否已被使用
    const existingIdCard = await IdentityVerification.findOne({ 
      idCardNumber,
      status: 'approved'
    });
    if (existingIdCard) {
      return res.status(400).json({ error: '该身份证号已被认证' });
    }
    
    // 处理图片上传
    let frontImageURL = null;
    let backImageURL = null;
    
    // 如果有Base64图片数据（从移动端）
    if (idCardFrontImageData) {
      // 将Base64保存为文件
      const base64Data = idCardFrontImageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `front-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
      const filepath = path.join('uploads/identity-verification/', filename);
      
      if (!fs.existsSync('uploads/identity-verification/')) {
        fs.mkdirSync('uploads/identity-verification/', { recursive: true });
      }
      
      fs.writeFileSync(filepath, buffer);
      frontImageURL = `/uploads/identity-verification/${filename}`;
    } else if (req.files && req.files.idCardFront) {
      // 如果有上传的文件（从Web端）
      frontImageURL = `/uploads/identity-verification/${req.files.idCardFront[0].filename}`;
    }
    
    if (idCardBackImageData) {
      const base64Data = idCardBackImageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `back-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
      const filepath = path.join('uploads/identity-verification/', filename);
      
      if (!fs.existsSync('uploads/identity-verification/')) {
        fs.mkdirSync('uploads/identity-verification/', { recursive: true });
      }
      
      fs.writeFileSync(filepath, buffer);
      backImageURL = `/uploads/identity-verification/${filename}`;
    } else if (req.files && req.files.idCardBack) {
      backImageURL = `/uploads/identity-verification/${req.files.idCardBack[0].filename}`;
    }
    
    if (!frontImageURL || !backImageURL) {
      return res.status(400).json({ error: '请上传身份证正反面照片' });
    }
    
    // 创建或更新认证记录
    let verification;
    if (existingVerification) {
      // 更新现有记录
      verification = await IdentityVerification.findOneAndUpdate(
        { userId },
        {
          realName,
          idCardNumber,
          idCardFrontImage: frontImageURL,
          idCardBackImage: backImageURL,
          status: 'pending',
          rejectionReason: null,
          reviewedAt: null,
          reviewerId: null
        },
        { new: true }
      );
    } else {
      // 创建新记录
      verification = await IdentityVerification.create({
        userId,
        realName,
        idCardNumber,
        idCardFrontImage: frontImageURL,
        idCardBackImage: backImageURL,
        status: 'pending'
      });
    }
    
    // 更新用户认证状态
    await User.findByIdAndUpdate(userId, {
      identityVerificationStatus: 'pending',
      identityVerificationId: verification._id
    });
    
    res.json({ 
      verification,
      message: '实名认证已提交，等待审核'
    });
  } catch (error) {
    console.error('提交实名认证失败:', error);
    res.status(500).json({ error: '提交实名认证失败' });
  }
});

// 人脸识别验证（即时认证）
router.post('/face-verify', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { faceImageData, realName, idCardNumber } = req.body;
    
    // 验证输入
    if (!faceImageData) {
      return res.status(400).json({ 
        success: false,
        error: '请提供人脸图像' 
      });
    }
    
    if (!realName || !idCardNumber) {
      return res.status(400).json({ 
        success: false,
        error: '请提供姓名和身份证号' 
      });
    }
    
    // 引入人脸识别服务
    const faceRecognitionService = require('../services/faceRecognitionService');
    
    // 将Base64图像转换为Buffer
    let imageBuffer;
    try {
      // 移除Base64前缀（如果有）
      const base64Data = faceImageData.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        error: '图像格式错误，请提供有效的Base64图像' 
      });
    }
    
    // 调用Face++进行人脸识别验证
    const verificationResult = await faceRecognitionService.verifyFace(imageBuffer);
    
    if (!verificationResult.success) {
      // 验证失败，返回错误信息
      return res.status(400).json({
        success: false,
        error: verificationResult.error || '人脸识别验证失败',
        code: verificationResult.code || 'VERIFICATION_FAILED'
      });
    }
    
    // 验证成功，创建或更新认证记录
    const existingVerification = await IdentityVerification.findOne({ userId });
    
    let verification;
    if (existingVerification) {
      // 更新现有记录（即时通过）
      verification = await IdentityVerification.findOneAndUpdate(
        { userId },
        {
          status: 'approved',
          rejectionReason: null,
          reviewedAt: new Date(),
          reviewerId: 'system' // 系统自动审核
        },
        { new: true }
      );
    } else {
      // 创建新记录（即时通过）
      verification = await IdentityVerification.create({
        userId,
        realName: realName, // 用户输入的姓名
        idCardNumber: idCardNumber, // 用户输入的身份证号
        idCardFrontImage: null, // 人脸识别不需要身份证照片
        idCardBackImage: null,
        status: 'approved', // 即时通过
        reviewedAt: new Date(),
        reviewerId: 'system'
      });
    }
    
    // 更新用户认证状态（即时生效）
    await User.findByIdAndUpdate(userId, {
      isIdentityVerified: true,
      identityVerificationStatus: 'approved',
      identityVerificationId: verification._id
    });
    
    res.json({
      success: true,
      verification,
      message: '人脸识别认证成功',
      faceToken: verificationResult.faceToken, // 保存face_token用于后续比对
      quality: verificationResult.quality
    });
  } catch (error) {
    console.error('人脸识别验证失败:', error);
    res.status(500).json({ 
      success: false,
      error: '人脸识别验证失败',
      message: error.message 
    });
  }
});

// 管理员审核实名认证（可选功能）
router.post('/:id/review', auth, async (req, res) => {
  try {
    // 检查是否为管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    const { id } = req.params;
    const { approved, rejectionReason } = req.body;
    
    const verification = await IdentityVerification.findById(id);
    if (!verification) {
      return res.status(404).json({ error: '认证记录不存在' });
    }
    
    const status = approved ? 'approved' : 'rejected';
    
    verification.status = status;
    verification.reviewedAt = new Date();
    verification.reviewerId = req.user.userId;
    if (!approved && rejectionReason) {
      verification.rejectionReason = rejectionReason;
    } else {
      verification.rejectionReason = null;
    }
    
    await verification.save();
    
    // 更新用户认证状态
    await User.findByIdAndUpdate(verification.userId, {
      isIdentityVerified: approved,
      identityVerificationStatus: status
    });
    
    res.json({ 
      verification,
      message: approved ? '认证已通过' : '认证已拒绝'
    });
  } catch (error) {
    console.error('审核实名认证失败:', error);
    res.status(500).json({ error: '审核实名认证失败' });
  }
});

module.exports = router;

