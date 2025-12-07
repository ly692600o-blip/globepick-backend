const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
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
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        min: 0
    },
    category: {
        type: String,
        enum: ['electronics', 'clothing', 'cosmetics', 'books', 'home', 'sports', 'toys', 'food', 'other'],
        required: true
    },
    condition: {
        type: String,
        enum: ['new', 'likeNew', 'good', 'fair', 'poor'],
        required: true
    },
    location: {
        type: String
    },
    ipLocation: {
        type: String
    },
    deliveryMethod: {
        type: String,
        enum: ['pickup', 'shipping', 'negotiable'],
        default: 'negotiable'
    },
    shippingFee: {
        type: Number,
        default: 0,
        min: 0
    },
    shippingFeePaidBy: {
        type: String,
        enum: ['buyer', 'seller', 'negotiable'],
        default: 'buyer'
    },
    tags: [{
        type: String
    }],
    viewsCount: {
        type: Number,
        default: 0
    },
    likesCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['available', 'reserved', 'sold', 'removed'],
        default: 'available'
    },
    aspectRatio: {
        type: Number,
        default: 1.0
    }
}, {
    timestamps: true
});

// 索引
marketplaceItemSchema.index({ userId: 1 });
marketplaceItemSchema.index({ category: 1 });
marketplaceItemSchema.index({ status: 1 });
marketplaceItemSchema.index({ createdAt: -1 });
marketplaceItemSchema.index({ price: 1 });

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema);

