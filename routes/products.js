const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getClientIP, getIPLocation } = require('../utils/ipLocation');
const router = express.Router();

// 获取商品列表（分页）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const status = req.query.status || 'active';
    
    const query = { status };
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username avatarURL');
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取商品列表失败', details: error.message });
  }
});

// 创建商品（代购需求）
router.post('/', auth, async (req, res) => {
  try {
    const { 
      title, description, images, price, originalPrice, currency, location, 
      category, tags, availableCount,       targetCountry, requiredQuantity, 
      expectedReturnDate, expectedTip, legalAgreementVersion, legalAgreedAt, legalAgreedIP
    } = req.body;
    
    if (!title || !description || !targetCountry || !requiredQuantity || !expectedReturnDate) {
      return res.status(400).json({ error: '必填字段不能为空' });
    }
    
    // 获取用户信息
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取用户IP属地
    const clientIP = getClientIP(req);
    const ipLocation = await getIPLocation(clientIP);
    
    // 创建商品
    const product = new Product({
      userId: req.userId,
      title,
      description,
      images: images || [],
      price: price || 0, // 发布时可以为0，代购者填写后更新
      originalPrice: originalPrice || null,
      currency: currency || null, // 发布时可以为空
      location: location || null,
      ipLocation: ipLocation || null,
      targetCountry,
      requiredQuantity,
      expectedReturnDate: new Date(expectedReturnDate),
      expectedTip: expectedTip || 0,
      category: category || null,
      tags: tags || [],
      availableCount: availableCount || requiredQuantity,
      status: 'pending',
      legalAgreementVersion: legalAgreementVersion || 'v1.0',
      legalAgreedAt: legalAgreedAt ? new Date(legalAgreedAt) : new Date(),
      legalAgreedIP: legalAgreedIP || clientIP
    });
    
    await product.save();
    
    res.status(201).json({
      message: '代购需求发布成功',
      product
    });
  } catch (error) {
    res.status(500).json({ error: '发布代购需求失败', details: error.message });
  }
});

// 获取商品详情
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // 检查是否是mock数据ID（格式为 mock_product_*）
    // 如果是mock数据，直接返回404，让前端使用本地数据
    if (productId.startsWith('mock_')) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查ID格式是否为有效的MongoDB ObjectId（24位十六进制字符串）
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    const product = await Product.findById(productId)
      .populate('userId', 'username avatarURL bio')
      .populate('acceptedBy', 'username avatarURL');
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 增加浏览数
    product.viewsCount += 1;
    await product.save();
    
    res.json(product);
  } catch (error) {
    // 如果是ObjectId转换错误，返回404而不是500
    if (error.message && error.message.includes('Cast to ObjectId')) {
      return res.status(404).json({ error: '商品不存在' });
    }
    res.status(500).json({ error: '获取商品详情失败', details: error.message });
  }
});

// 接单（代购者接单）
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const { legalAgreedAt, legalAgreedIP, legalAgreementVersion } = req.body;
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: '代购需求不存在' });
    }
    
    if (product.status !== 'pending') {
      return res.status(400).json({ error: '该需求已被接单或已取消' });
    }
    
    // 检查是否是自己发布的需求
    if (product.userId.toString() === req.userId) {
      return res.status(400).json({ error: '不能接自己的订单' });
    }
    
    const clientIP = getClientIP(req);
    
    // 更新商品状态
    product.acceptedBy = req.userId;
    product.acceptedAt = new Date();
    product.status = 'accepted';
    product.legalAgreementVersion = legalAgreementVersion || 'v1.0';
    
    await product.save();
    
    res.json({
      message: '接单成功',
      product
    });
  } catch (error) {
    res.status(500).json({ error: '接单失败', details: error.message });
  }
});

// 更新代购者上传的照片
router.put('/:id/purchaser-images', auth, async (req, res) => {
  try {
    const { purchaserImages } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查是否是接单者
    if (product.acceptedBy?.toString() !== req.userId) {
      return res.status(403).json({ error: '无权修改此商品' });
    }
    
    product.purchaserImages = purchaserImages || [];
    
    // 如果有照片，更新状态为已购买
    if (purchaserImages && purchaserImages.length > 0 && product.status === 'accepted') {
      product.status = 'purchased';
    }
    
    await product.save();
    
    res.json({
      message: '照片更新成功',
      product
    });
  } catch (error) {
    res.status(500).json({ error: '更新照片失败', details: error.message });
  }
});

// 更新购物小票
router.put('/:id/receipt', auth, async (req, res) => {
  try {
    const { receiptImage } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查是否是接单者
    if (product.acceptedBy?.toString() !== req.userId) {
      return res.status(403).json({ error: '无权修改此商品' });
    }
    
    product.receiptImage = receiptImage;
    await product.save();
    
    res.json({
      message: '小票更新成功',
      product
    });
  } catch (error) {
    res.status(500).json({ error: '更新小票失败', details: error.message });
  }
});

// 更新物流信息
router.put('/:id/tracking', auth, async (req, res) => {
  try {
    const { trackingNumber, trackingCompany } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查是否是接单者
    if (product.acceptedBy?.toString() !== req.userId) {
      return res.status(403).json({ error: '无权修改此商品' });
    }
    
    product.trackingNumber = trackingNumber;
    product.trackingCompany = trackingCompany;
    
    // 更新状态为物流中
    if (trackingNumber && product.status === 'purchased') {
      product.status = 'shipping';
    }
    
    await product.save();
    
    res.json({
      message: '物流信息更新成功',
      product
    });
  } catch (error) {
    res.status(500).json({ error: '更新物流信息失败', details: error.message });
  }
});

// 获取待接单商品列表
router.get('/pending', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const country = req.query.country;
    
    const query = { status: 'pending' };
    if (country && country !== 'all') {
      query.targetCountry = country;
    }
    
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username avatarURL');
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取待接单商品列表失败', details: error.message });
  }
});

// 获取代购者已接单的商品
router.get('/accepted/:userId', async (req, res) => {
  try {
    const products = await Product.find({ 
      acceptedBy: req.params.userId,
      status: { $in: ['accepted', 'purchased', 'shipping'] }
    })
      .sort({ acceptedAt: -1 })
      .populate('userId', 'username avatarURL');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: '获取已接单商品失败', details: error.message });
  }
});

// 获取用户的商品
router.get('/user/:userId', async (req, res) => {
  try {
    const products = await Product.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatarURL');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: '获取用户商品失败', details: error.message });
  }
});

// 更新商品
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查是否是商品所有者
    if (product.userId.toString() !== req.userId) {
      return res.status(403).json({ error: '无权修改此商品' });
    }
    
    const { title, description, images, price, originalPrice, currency, location, category, tags, availableCount, status } = req.body;
    
    if (title) product.title = title;
    if (description) product.description = description;
    if (images) product.images = images;
    if (price !== undefined) product.price = price;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (currency) product.currency = currency;
    if (location !== undefined) product.location = location;
    if (category !== undefined) product.category = category;
    if (tags) product.tags = tags;
    if (availableCount !== undefined) product.availableCount = availableCount;
    if (status) product.status = status;
    
    await product.save();
    
    res.json({
      message: '商品更新成功',
      product
    });
  } catch (error) {
    res.status(500).json({ error: '更新商品失败', details: error.message });
  }
});

// 删除商品
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查是否是商品所有者
    if (product.userId.toString() !== req.userId) {
      return res.status(403).json({ error: '无权删除此商品' });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: '商品删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除商品失败', details: error.message });
  }
});

// 点赞商品
router.post('/:id/like', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // TODO: 检查是否已点赞（需要Like模型）
    product.likesCount += 1;
    await product.save();
    
    res.json({ message: '点赞成功', likesCount: product.likesCount });
  } catch (error) {
    res.status(500).json({ error: '点赞失败', details: error.message });
  }
});

module.exports = router;

