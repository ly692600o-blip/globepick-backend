const express = require('express');
const MarketplaceItem = require('../models/MarketplaceItem');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getClientIP, getIPLocation } = require('../utils/ipLocation');
const router = express.Router();

// 获取市集商品列表
router.get('/', async (req, res) => {
    try {
        const {
            category,
            condition,
            minPrice,
            maxPrice,
            location,
            deliveryMethod,
            status = 'available',
            page = 1,
            limit = 20,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        // 构建查询条件
        const query = {};

        if (category) {
            query.category = category;
        }

        if (condition) {
            query.condition = condition;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) {
                query.price.$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                query.price.$lte = parseFloat(maxPrice);
            }
        }

        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }

        if (deliveryMethod) {
            query.deliveryMethod = deliveryMethod;
        }

        if (status) {
            query.status = status;
        }

        // 构建排序
        const sortOptions = {};
        sortOptions[sort] = order === 'asc' ? 1 : -1;

        // 分页
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 查询
        const items = await MarketplaceItem.find(query)
            .populate('userId', 'username avatarURL')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // 总数
        const total = await MarketplaceItem.countDocuments(query);

        res.json({
            items,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('获取市集商品列表失败:', error);
        res.status(500).json({ error: '获取商品列表失败', details: error.message });
    }
});

// 搜索市集商品（必须在 /:id 之前）
router.get('/search', async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

        const query = { status: 'available' };

        // 搜索关键词
        if (q) {
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) {
                query.price.$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                query.price.$lte = parseFloat(maxPrice);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const items = await MarketplaceItem.find(query)
            .populate('userId', 'username avatarURL')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await MarketplaceItem.countDocuments(query);

        res.json({
            items,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('搜索商品失败:', error);
        res.status(500).json({ error: '搜索商品失败', details: error.message });
    }
});

// 获取单个市集商品详情
router.get('/:id', async (req, res) => {
    try {
        const item = await MarketplaceItem.findById(req.params.id)
            .populate('userId', 'username avatarURL ipLocation');

        if (!item) {
            return res.status(404).json({ error: '商品不存在' });
        }

        // 增加浏览量
        item.viewsCount += 1;
        await item.save();

        res.json(item);
    } catch (error) {
        console.error('获取商品详情失败:', error);
        res.status(500).json({ error: '获取商品详情失败', details: error.message });
    }
});

// 创建市集商品
router.post('/', auth, async (req, res) => {
    try {
        const {
            title, description, images, price, originalPrice, category, condition,
            location, deliveryMethod, shippingFee, shippingFeePaidBy, tags
        } = req.body;

        if (!title || !description || !price || !category || !condition) {
            return res.status(400).json({ error: '缺少必要的商品信息' });
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
        const item = new MarketplaceItem({
            userId: req.userId,
            title,
            description,
            images: images || [],
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : null,
            category,
            condition,
            location: location || null,
            ipLocation: ipLocation || null,
            deliveryMethod: deliveryMethod || 'negotiable',
            shippingFee: shippingFee ? parseFloat(shippingFee) : 0,
            shippingFeePaidBy: shippingFeePaidBy || 'buyer',
            tags: tags || [],
            status: 'available'
        });

        await item.save();

        // 填充用户信息
        await item.populate('userId', 'username avatarURL');

        res.status(201).json({
            message: '商品发布成功',
            item
        });
    } catch (error) {
        console.error('发布商品失败:', error);
        res.status(500).json({ error: '发布商品失败', details: error.message });
    }
});

// 更新市集商品
router.patch('/:id', auth, async (req, res) => {
    try {
        const item = await MarketplaceItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: '商品不存在' });
        }

        // 验证权限（只有卖家可以更新）
        if (item.userId.toString() !== req.userId) {
            return res.status(403).json({ error: '无权更新此商品' });
        }

        // 更新字段
        const allowedUpdates = [
            'title', 'description', 'images', 'price', 'originalPrice',
            'category', 'condition', 'location', 'deliveryMethod',
            'shippingFee', 'shippingFeePaidBy', 'tags', 'status'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                item[field] = req.body[field];
            }
        });

        await item.save();

        res.json({
            message: '商品更新成功',
            item
        });
    } catch (error) {
        console.error('更新商品失败:', error);
        res.status(500).json({ error: '更新商品失败', details: error.message });
    }
});

// 删除市集商品
router.delete('/:id', auth, async (req, res) => {
    try {
        const item = await MarketplaceItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: '商品不存在' });
        }

        // 验证权限（只有卖家可以删除）
        if (item.userId.toString() !== req.userId) {
            return res.status(403).json({ error: '无权删除此商品' });
        }

        // 软删除：更新状态为已下架
        item.status = 'removed';
        await item.save();

        res.json({
            message: '商品已下架'
        });
    } catch (error) {
        console.error('删除商品失败:', error);
        res.status(500).json({ error: '删除商品失败', details: error.message });
    }
});

// 搜索市集商品
router.get('/search', async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

        const query = { status: 'available' };

        // 搜索关键词
        if (q) {
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) {
                query.price.$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                query.price.$lte = parseFloat(maxPrice);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const items = await MarketplaceItem.find(query)
            .populate('userId', 'username avatarURL')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await MarketplaceItem.countDocuments(query);

        res.json({
            items,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('搜索商品失败:', error);
        res.status(500).json({ error: '搜索商品失败', details: error.message });
    }
});

module.exports = router;

