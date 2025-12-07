const express = require('express');
const MarketplaceOrder = require('../models/MarketplaceOrder');
const MarketplaceItem = require('../models/MarketplaceItem');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getClientIP, getIPLocation } = require('../utils/ipLocation');
const router = express.Router();

// 计算平台手续费（四档阶梯费率）
function calculatePlatformFee(totalPrice) {
    if (totalPrice <= 500) {
        return totalPrice * 0.05; // ≤500元：5%
    } else if (totalPrice <= 3000) {
        return totalPrice * 0.04; // 500-3000元：4%
    } else if (totalPrice <= 10000) {
        return totalPrice * 0.03; // 3000-10000元：3%
    } else {
        return totalPrice * 0.025; // >10000元：2.5%
    }
}

// 创建市集订单
router.post('/', auth, async (req, res) => {
    try {
        const {
            itemId, quantity, itemPrice, totalPrice, platformFee, shippingFee,
            totalAmount, deliveryMethod, shippingAddress, pickupAddress,
            shippingFeePaidBy, notes, ipLocation, buyerLegalAgreedAt,
            buyerLegalAgreedIP, legalAgreementVersion
        } = req.body;

        if (!itemId || !quantity || !itemPrice || !totalPrice || !totalAmount) {
            return res.status(400).json({ error: '缺少必要的订单信息' });
        }

        // 获取商品信息
        const item = await MarketplaceItem.findById(itemId)
            .populate('userId', 'username avatarURL');

        if (!item) {
            return res.status(404).json({ error: '商品不存在' });
        }

        if (item.status !== 'available') {
            return res.status(400).json({ error: '商品已下架或不可购买' });
        }

        // 获取买家信息
        const buyer = await User.findById(req.userId);
        if (!buyer) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 获取卖家信息
        const seller = await User.findById(item.userId._id);
        if (!seller) {
            return res.status(404).json({ error: '卖家不存在' });
        }

        // 获取用户IP属地
        const clientIP = getClientIP(req);
        const detectedIPLocation = await getIPLocation(clientIP);
        const finalIPLocation = ipLocation || detectedIPLocation;

        // 验证平台手续费（如果前端传入，验证是否正确）
        const calculatedFee = calculatePlatformFee(totalPrice);
        if (Math.abs(platformFee - calculatedFee) > 0.01) {
            return res.status(400).json({ error: '平台手续费计算错误' });
        }

        // 创建订单
        const order = new MarketplaceOrder({
            itemId,
            itemTitle: item.title,
            itemImage: item.images[0] || null,
            sellerId: item.userId._id,
            sellerUsername: seller.username,
            sellerAvatarURL: seller.avatarURL,
            buyerId: req.userId,
            buyerUsername: buyer.username,
            buyerAvatarURL: buyer.avatarURL,
            quantity,
            itemPrice,
            totalPrice,
            platformFee,
            shippingFee: shippingFee || 0,
            totalAmount,
            deliveryMethod: deliveryMethod || 'negotiable',
            shippingAddress: deliveryMethod === 'shipping' ? shippingAddress : null,
            pickupAddress: deliveryMethod === 'pickup' ? (pickupAddress || item.location) : null,
            shippingFeePaidBy: shippingFeePaidBy || 'buyer',
            notes: notes || null,
            ipLocation: finalIPLocation,
            buyerLegalAgreedAt: buyerLegalAgreedAt ? new Date(buyerLegalAgreedAt) : new Date(),
            buyerLegalAgreedIP: buyerLegalAgreedIP || finalIPLocation,
            legalAgreementVersion: legalAgreementVersion || '1.0',
            status: 'pending'
        });

        await order.save();

        // 更新商品状态为已预订
        item.status = 'reserved';
        await item.save();

        res.status(201).json({
            message: '订单创建成功',
            order
        });
    } catch (error) {
        console.error('创建市集订单失败:', error);
        res.status(500).json({ error: '创建订单失败', details: error.message });
    }
});

// 获取市集订单列表（买家）
router.get('/buyer', auth, async (req, res) => {
    try {
        const orders = await MarketplaceOrder.find({ buyerId: req.userId })
            .sort({ createdAt: -1 })
            .populate('itemId', 'title images')
            .populate('sellerId', 'username avatarURL');

        res.json(orders);
    } catch (error) {
        console.error('获取买家订单列表失败:', error);
        res.status(500).json({ error: '获取订单列表失败', details: error.message });
    }
});

// 获取市集订单列表（卖家）
router.get('/seller', auth, async (req, res) => {
    try {
        const orders = await MarketplaceOrder.find({ sellerId: req.userId })
            .sort({ createdAt: -1 })
            .populate('itemId', 'title images')
            .populate('buyerId', 'username avatarURL');

        res.json(orders);
    } catch (error) {
        console.error('获取卖家订单列表失败:', error);
        res.status(500).json({ error: '获取订单列表失败', details: error.message });
    }
});

// 获取所有订单（买家+卖家）
router.get('/', auth, async (req, res) => {
    try {
        const orders = await MarketplaceOrder.find({
            $or: [
                { buyerId: req.userId },
                { sellerId: req.userId }
            ]
        })
            .sort({ createdAt: -1 })
            .populate('itemId', 'title images')
            .populate('buyerId', 'username avatarURL')
            .populate('sellerId', 'username avatarURL');

        res.json(orders);
    } catch (error) {
        console.error('获取订单列表失败:', error);
        res.status(500).json({ error: '获取订单列表失败', details: error.message });
    }
});

// 确认收货并结算
router.post('/:id/confirm-receipt', auth, async (req, res) => {
    try {
        const order = await MarketplaceOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }

        // 验证权限（只有买家可以确认收货）
        if (order.buyerId.toString() !== req.userId) {
            return res.status(403).json({ error: '只有买家可以确认收货' });
        }

        // 验证订单状态
        if (order.status !== 'shipping') {
            return res.status(400).json({ error: '订单状态不正确，无法确认收货' });
        }

        // 更新订单状态为已签收
        order.status = 'received';
        order.receivedAt = new Date();

        // 自动结算
        const settlementAmount = order.totalPrice - order.platformFee;
        const platformRevenue = order.platformFee;

        order.settlementAmount = settlementAmount;
        order.platformRevenue = platformRevenue;
        order.settlementStatus = 'completed';
        order.settlementAt = new Date();
        order.status = 'completed';
        order.completedAt = new Date();

        await order.save();

        // 更新商品状态为已售出
        const item = await MarketplaceItem.findById(order.itemId);
        if (item) {
            item.status = 'sold';
            await item.save();
        }

        res.json({
            message: '确认收货成功，已自动结算',
            order
        });
    } catch (error) {
        console.error('确认收货失败:', error);
        res.status(500).json({ error: '确认收货失败', details: error.message });
    }
});

// 更新订单状态（发货）
router.patch('/:id/ship', auth, async (req, res) => {
    try {
        const { trackingNumber, trackingCompany } = req.body;
        const order = await MarketplaceOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }

        // 验证权限（只有卖家可以发货）
        if (order.sellerId.toString() !== req.userId) {
            return res.status(403).json({ error: '只有卖家可以发货' });
        }

        // 验证订单状态
        if (order.status !== 'paid') {
            return res.status(400).json({ error: '订单状态不正确，无法发货' });
        }

        order.status = 'shipping';
        order.shippedAt = new Date();
        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }
        if (trackingCompany) {
            order.trackingCompany = trackingCompany;
        }

        await order.save();

        res.json({
            message: '发货成功',
            order
        });
    } catch (error) {
        console.error('发货失败:', error);
        res.status(500).json({ error: '发货失败', details: error.message });
    }
});

// 支付订单
router.post('/:id/pay', auth, async (req, res) => {
    try {
        const order = await MarketplaceOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }

        // 验证权限（只有买家可以支付）
        if (order.buyerId.toString() !== req.userId) {
            return res.status(403).json({ error: '只有买家可以支付' });
        }

        // 验证订单状态
        if (order.status !== 'pending') {
            return res.status(400).json({ error: '订单状态不正确，无法支付' });
        }

        // 更新订单状态为已付款
        order.status = 'paid';
        order.paidAt = new Date();

        await order.save();

        res.json({
            message: '支付成功',
            order
        });
    } catch (error) {
        console.error('支付失败:', error);
        res.status(500).json({ error: '支付失败', details: error.message });
    }
});

// 取消订单
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const order = await MarketplaceOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }

        // 验证权限（买家或卖家都可以取消）
        if (order.buyerId.toString() !== req.userId && order.sellerId.toString() !== req.userId) {
            return res.status(403).json({ error: '无权取消此订单' });
        }

        // 验证订单状态（只有待付款或已付款的订单可以取消）
        if (order.status !== 'pending' && order.status !== 'paid') {
            return res.status(400).json({ error: '订单状态不正确，无法取消' });
        }

        order.status = 'cancelled';
        order.cancelledAt = new Date();

        await order.save();

        // 恢复商品状态为在售
        const item = await MarketplaceItem.findById(order.itemId);
        if (item) {
            item.status = 'available';
            await item.save();
        }

        res.json({
            message: '订单已取消',
            order
        });
    } catch (error) {
        console.error('取消订单失败:', error);
        res.status(500).json({ error: '取消订单失败', details: error.message });
    }
});

module.exports = router;

