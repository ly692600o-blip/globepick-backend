const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    price: {
        type: Number,
        default: 0, // 发布时可以为0，代购者填写价格后更新
        min: 0
    },
    originalPrice: {
        type: Number,
        min: 0
    },
    currency: {
        type: String,
        default: 'CNY'
    },
    location: {
        type: String
    },
    ipLocation: {
        type: String
    },
    category: {
        type: String
    },
    tags: [{
        type: String
    }],
    availableCount: {
        type: Number,
        default: 1,
        min: 1
    },
    ordersCount: {
        type: Number,
        default: 0
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    likesCount: {
        type: Number,
        default: 0
    },
    // 代购需求信息
    targetCountry: {
        type: String,
        required: true
    },
    requiredQuantity: {
        type: Number,
        required: true,
        min: 1
    },
    expectedReturnDate: {
        type: Date,
        required: true
    },
    expectedTip: {
        type: Number,
        default: 0, // 期望小费（可选，用户发布需求时设置）
        min: 0
    },
    
    // 接单信息
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acceptedAt: {
        type: Date
    },
    
    // 代购者上传的内容
    purchaserImages: [{
        type: String
    }],
    receiptImage: {
        type: String
    },
    
    // 物流信息
    trackingNumber: {
        type: String
    },
    trackingCompany: {
        type: String
    },
    
    // 法律确认
    legalAgreementVersion: {
        type: String
    },
    legalAgreedAt: {
        type: Date
    },
    legalAgreedIP: {
        type: String
    },
    
    status: {
        type: String,
        enum: ['pending', 'accepted', 'purchased', 'shipping', 'completed', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// 索引
productSchema.index({ userId: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ category: 1 });
productSchema.index({ tags: 1 });

module.exports = mongoose.model('Product', productSchema);

