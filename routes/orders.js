const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getClientIP, getIPLocation } = require('../utils/ipLocation');
const router = express.Router();

// 创建订单
router.post('/', auth, async (req, res) => {
  try {
    const { productId, quantity, shippingAddress, shippingFee, notes } = req.body;
    
    if (!productId || !quantity || !shippingAddress) {
      return res.status(400).json({ error: '商品ID、数量和收货地址不能为空' });
    }
    
    // 获取商品信息
    const product = await Product.findById(productId)
      .populate('userId', 'username avatarURL');
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    if (product.status !== 'active') {
      return res.status(400).json({ error: '商品已下架或不可购买' });
    }
    
    if (quantity > product.availableCount) {
      return res.status(400).json({ error: '购买数量超过可代购数量' });
    }
    
    // 获取买家信息
    const buyer = await User.findById(req.userId);
    if (!buyer) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取用户IP属地
    const clientIP = getClientIP(req);
    const ipLocation = await getIPLocation(clientIP);
    
    // 计算费用（商品总价 + 代购费10% + 平台手续费5%）
    const productPrice = product.price * quantity;
    const serviceFee = productPrice * 0.10;      // 代购费 10%
    const platformFee = productPrice * 0.05;     // 平台手续费 5%
    const totalAmount = productPrice + serviceFee + platformFee + (shippingFee || 0);
    
    // 创建订单
    const order = new Order({
      productId,
      buyerId: req.userId,
      sellerId: product.userId._id,
      quantity,
      price: product.price,
      productPrice: productPrice,
      serviceFee: serviceFee,
      platformFee: platformFee,
      totalAmount: totalAmount,
      shippingFee: shippingFee || 0,
      shippingAddress,
      notes: notes || null,
      ipLocation: ipLocation || null,
      status: 'pending',
      settlementStatus: 'pending'
    });
    
    await order.save();
    
    // 更新商品已接单数量
    product.ordersCount += quantity;
    product.availableCount -= quantity;
    if (product.availableCount <= 0) {
      product.status = 'completed';
    }
    await product.save();
    
    res.status(201).json({
      message: '订单创建成功',
      order
    });
  } catch (error) {
    res.status(500).json({ error: '创建订单失败', details: error.message });
  }
});

// 获取订单列表（买家）
router.get('/buyer', auth, async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.userId })
      .sort({ createdAt: -1 })
      .populate('productId', 'title images')
      .populate('sellerId', 'username avatarURL');
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: '获取订单列表失败', details: error.message });
  }
});

// 获取订单列表（卖家）
router.get('/seller', auth, async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.userId })
      .sort({ createdAt: -1 })
      .populate('productId', 'title images')
      .populate('buyerId', 'username avatarURL');
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: '获取订单列表失败', details: error.message });
  }
});

// 代购者提交订单（包含价格信息，无需收货地址）
// 注意：这个路由必须在 /:id 路由之前
router.post('/seller-submit', auth, async (req, res) => {
  try {
    const { 
      productId, quantity, price, productPrice, serviceFee, platformFee, 
      tip, totalAmount, notes, sellerLegalAgreedAt, sellerLegalAgreedIP, 
      legalAgreementVersion 
    } = req.body;
    
    if (!productId || !quantity || !price || !productPrice || !serviceFee || !platformFee || !totalAmount) {
      return res.status(400).json({ error: '缺少必要的订单信息' });
    }
    
    // 获取商品信息
    const product = await Product.findById(productId)
      .populate('userId', 'username avatarURL');
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查商品是否已被接单
    if (product.status !== 'accepted' || !product.acceptedBy) {
      return res.status(400).json({ error: '商品尚未被接单或已被其他代购者接单' });
    }
    
    // 检查是否是接单的代购者
    if (product.acceptedBy.toString() !== req.userId) {
      return res.status(403).json({ error: '您不是此商品的接单者' });
    }
    
    // 检查数量是否超过需求数量
    if (quantity > product.requiredQuantity) {
      return res.status(400).json({ error: '代购数量超过需求数量' });
    }
    
    // 更新商品价格信息
    product.price = price;
    if (req.body.originalPrice !== undefined) {
      product.originalPrice = req.body.originalPrice;
    }
    if (req.body.currency) {
      product.currency = req.body.currency;
    }
    await product.save();
    
    // 获取买家信息（商品发布者）
    const buyer = await User.findById(product.userId._id);
    if (!buyer) {
      return res.status(404).json({ error: '买家不存在' });
    }
    
    // 获取卖家信息（代购者）
    const seller = await User.findById(req.userId);
    if (!seller) {
      return res.status(404).json({ error: '卖家不存在' });
    }
    
    // 获取用户IP属地
    const clientIP = getClientIP(req);
    const ipLocation = await getIPLocation(clientIP);
    
    // 创建订单（状态为pending，等待客户支付）
    const order = new Order({
      productId,
      buyerId: product.userId._id,
      sellerId: req.userId,
      quantity,
      price,
      productPrice,
      serviceFee,
      platformFee,
      tip: tip || 0,
      totalAmount,
      shippingFee: 0,
      shippingAddress: null, // 客户支付时填写
      notes: notes || null,
      ipLocation: ipLocation || null,
      status: 'pending', // 等待客户支付
      settlementStatus: 'pending',
      sellerLegalAgreedAt: sellerLegalAgreedAt ? new Date(sellerLegalAgreedAt) : new Date(),
      sellerLegalAgreedIP: sellerLegalAgreedIP || clientIP,
      legalAgreementVersion: legalAgreementVersion || 'v1.0'
    });
    
    await order.save();
    
    // 更新商品订单数量
    product.ordersCount += quantity;
    await product.save();
    
    res.status(201).json({
      message: '订单提交成功，等待客户支付',
      order: await Order.findById(order._id)
        .populate('productId', 'title images')
        .populate('buyerId', 'username avatarURL')
        .populate('sellerId', 'username avatarURL')
    });
  } catch (error) {
    console.error('代购者提交订单失败:', error);
    res.status(500).json({ error: '提交订单失败', details: error.message });
  }
});

// 获取订单详情
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('productId')
      .populate('buyerId', 'username avatarURL')
      .populate('sellerId', 'username avatarURL');
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 检查是否有权限查看此订单
    if (order.buyerId._id.toString() !== req.userId && order.sellerId._id.toString() !== req.userId) {
      return res.status(403).json({ error: '无权查看此订单' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: '获取订单详情失败', details: error.message });
  }
});

// 更新订单状态
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 检查权限
    const isBuyer = order.buyerId.toString() === req.userId;
    const isSeller = order.sellerId.toString() === req.userId;
    
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: '无权修改此订单' });
    }
    
    // 状态转换规则
    const validTransitions = {
      'pending': ['paid', 'cancelled'], // 买家可以付款或取消
      'paid': ['processing', 'refunded'], // 卖家可以接单或退款
      'processing': ['shipping'], // 卖家可以发货
      'shipping': ['completed'], // 买家可以确认完成
      'completed': [],
      'cancelled': [],
      'refunded': []
    };
    
    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ error: '无效的状态转换' });
    }
    
    order.status = status;
    
    // 更新时间戳
    const now = new Date();
    switch (status) {
      case 'paid':
        order.paidAt = now;
        break;
      case 'shipping':
        order.shippedAt = now;
        break;
      case 'completed':
        order.completedAt = now;
        break;
      case 'cancelled':
        order.cancelledAt = now;
        // 恢复商品库存
        const product = await Product.findById(order.productId);
        if (product) {
          product.availableCount += order.quantity;
          product.ordersCount -= order.quantity;
          if (product.status === 'completed') {
            product.status = 'active';
          }
          await product.save();
        }
        break;
    }
    
    await order.save();
    
    res.json({
      message: '订单状态更新成功',
      order
    });
  } catch (error) {
    res.status(500).json({ error: '更新订单状态失败', details: error.message });
  }
});

// 更新物流单号
router.put('/:id/tracking', auth, async (req, res) => {
  try {
    const { trackingNumber, trackingCompany } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 只有卖家可以更新物流单号
    if (order.sellerId.toString() !== req.userId) {
      return res.status(403).json({ error: '无权修改此订单' });
    }
    
    order.trackingNumber = trackingNumber;
    if (trackingCompany) {
      order.trackingCompany = trackingCompany;
    }
    
    await order.save();
    
    res.json({
      message: '物流单号更新成功',
      order
    });
  } catch (error) {
    res.status(500).json({ error: '更新物流单号失败', details: error.message });
  }
});

// 客户支付订单（填写地址并支付）
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    
    if (!shippingAddress) {
      return res.status(400).json({ error: '收货地址不能为空' });
    }
    
    // 验证收货地址字段
    if (!shippingAddress.receiverName || !shippingAddress.phone || 
        !shippingAddress.province || !shippingAddress.city || 
        !shippingAddress.district || !shippingAddress.address) {
      return res.status(400).json({ error: '收货地址信息不完整' });
    }
    
    // 获取订单
    const order = await Order.findById(req.params.id)
      .populate('productId')
      .populate('buyerId', 'username avatarURL')
      .populate('sellerId', 'username avatarURL');
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 检查权限（只有买家可以支付）
    if (order.buyerId._id.toString() !== req.userId) {
      return res.status(403).json({ error: '无权支付此订单' });
    }
    
    // 检查订单状态
    if (order.status !== 'pending') {
      return res.status(400).json({ error: '订单状态不正确，无法支付' });
    }
    
    // 更新订单收货地址
    order.shippingAddress = shippingAddress;
    
    // 更新订单状态为已支付
    order.status = 'paid';
    order.paidAt = new Date();
    
    // 获取用户IP属地
    const clientIP = getClientIP(req);
    const ipLocation = await getIPLocation(clientIP);
    if (ipLocation) {
      order.ipLocation = ipLocation;
    }
    
    await order.save();
    
    // 更新商品状态为已购买（代购者可以开始购买）
    const product = await Product.findById(order.productId);
    if (product) {
      // 商品状态保持为 accepted，等待代购者购买
      await product.save();
    }
    
    res.json({
      message: '订单支付成功',
      order: await Order.findById(order._id)
        .populate('productId', 'title images')
        .populate('buyerId', 'username avatarURL')
        .populate('sellerId', 'username avatarURL')
    });
  } catch (error) {
    console.error('支付订单失败:', error);
    res.status(500).json({ error: '支付订单失败', details: error.message });
  }
});

// 确认收货并触发结算
router.post('/:id/confirm-receipt', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 只有买家可以确认收货
    if (order.buyerId.toString() !== req.userId) {
      return res.status(403).json({ error: '无权确认此订单' });
    }
    
    if (order.status !== 'shipping') {
      return res.status(400).json({ error: '订单状态不正确，无法确认收货' });
    }
    
    // 计算结算金额（包含小费）
    const settlementAmount = order.productPrice + order.serviceFee + (order.tip || 0);  // 商品总价 + 代购费 + 小费
    const platformRevenue = order.platformFee;                       // 平台收益
    
    // 更新订单状态
    order.status = 'completed';
    order.completedAt = new Date();
    order.settlementAmount = settlementAmount;
    order.platformRevenue = platformRevenue;
    order.settlementStatus = 'completed';
    order.settlementAt = new Date();
    
    await order.save();
    
    // 更新商品状态
    const product = await Product.findById(order.productId);
    if (product) {
      product.status = 'completed';
      await product.save();
    }
    
    res.json({
      message: '确认收货成功，结算已完成',
      order: {
        ...order.toObject(),
        settlementAmount,
        platformRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ error: '确认收货失败', details: error.message });
  }
});

module.exports = router;

