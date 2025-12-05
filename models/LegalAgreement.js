const mongoose = require('mongoose');

const legalAgreementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    agreementType: {
        type: String,
        enum: ['buyer', 'seller'],
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    version: {
        type: String,
        required: true
    },
    agreedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    agreedIP: {
        type: String,
        required: true
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// 索引
legalAgreementSchema.index({ userId: 1, agreedAt: -1 });
legalAgreementSchema.index({ productId: 1 });
legalAgreementSchema.index({ orderId: 1 });

module.exports = mongoose.model('LegalAgreement', legalAgreementSchema);




