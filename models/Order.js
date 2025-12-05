const mongoose = require('mongoose');

const shippingAddressSchema = new mongoose.Schema({
    receiverName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    postalCode: {
        type: String
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    
    // 费用构成
    productPrice: {
        type: Number,
        required: true,
        min: 0
    },
    serviceFee: {
        type: Number,
        required: true,
        min: 0
    },
    platformFee: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    shippingFee: {
        type: Number,
        default: 0,
        min: 0
    },
    tip: {
        type: Number,
        default: 0, // 额外小费
        min: 0
    },
    
    // 结算信息
    settlementAmount: {
        type: Number
    },
    platformRevenue: {
        type: Number
    },
    settlementStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    settlementAt: {
        type: Date
    },
    
    status: {
        type: String,
        enum: ['pending', 'paid', 'purchased', 'shipping', 'completed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    shippingAddress: {
        type: shippingAddressSchema,
        required: false // 订单创建时可以为空，客户支付时填写
    },
    trackingNumber: {
        type: String
    },
    trackingCompany: {
        type: String
    },
    notes: {
        type: String
    },
    ipLocation: {
        type: String
    },
    
    // 法律确认
    buyerLegalAgreedAt: {
        type: Date
    },
    buyerLegalAgreedIP: {
        type: String
    },
    sellerLegalAgreedAt: {
        type: Date
    },
    sellerLegalAgreedIP: {
        type: String
    },
    legalAgreementVersion: {
        type: String
    },
    
    paidAt: Date,
    purchasedAt: Date,
    shippedAt: Date,
    completedAt: Date,
    cancelledAt: Date
}, {
    timestamps: true
});

// 索引
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ productId: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);

