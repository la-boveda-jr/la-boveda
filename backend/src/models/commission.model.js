import { Schema, model } from 'mongoose';

const commissionSchema = new Schema({
    scope: {
        type: String,
        enum: ['auction', 'product'],
        required: true,
        unique: true,
        index: true,
    },
    commissionType: {
        type: String,
        enum: ['fixed', 'percentage'],
        required: true,
        default: 'percentage',
    },
    commissionValue: {
        type: Number,
        required: true,
        min: 0,
    },
    description: {
        type: String,
        default: 'Global commission rate',
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

const Commission = model('Commission', commissionSchema);

export default Commission;