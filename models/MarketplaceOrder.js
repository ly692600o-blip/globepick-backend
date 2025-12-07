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

const marketplaceOrderSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MarketplaceItem',
        required: true
    },
    itemTitle: {
        type: String
    },
    itemImage: {
        type: String
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerUsername: {
        type: String
    },
    sellerAvatarURL: {
        type: String
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    buyerUsername: {
        type: String
    },
    buyerAvatarURL: {
        type: String
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    
    // 费用构成
    itemPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    platformFee: {
        type: Number,
        required: true,
        min: 0
    },
    shippingFee: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
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
        enum: ['pending', 'paid', 'shipping', 'received', 'completed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    deliveryMethod: {
        type: String,
        enum: ['pickup', 'shipping', 'negotiable'],
        default: 'negotiable'
    },
    shippingAddress: {
        type: shippingAddressSchema
    },
    pickupAddress: {
        type: String
    },
    trackingNumber: {
        type: String
    },
    trackingCompany: {
        type: String
    },
    shippingFeePaidBy: {
        type: String,
        enum: ['buyer', 'seller', 'negotiable'],
        default: 'buyer'
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
    
    paidAt: {
        type: Date
    },
    shippedAt: {
        type: Date
    },
    receivedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    }
}, {
    timestamps: true
});

// 索引
marketplaceOrderSchema.index({ buyerId: 1 });
marketplaceOrderSchema.index({ sellerId: 1 });
marketplaceOrderSchema.index({ itemId: 1 });
marketplaceOrderSchema.index({ status: 1 });
marketplaceOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MarketplaceOrder', marketplaceOrderSchema);

