import mongoose from 'mongoose';

const WithdrawalSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	amount: Number,
	stripeTransferId: String,
	status: {
		type: String,
		enum: ['pending', 'succeeded', 'failed'],
		default: 'pending',
	},
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model(
	'Withdrawal',
	WithdrawalSchema,
);
