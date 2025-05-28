import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
	customer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	pageId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
	},
	items: {},
	totalPrice: { type: Number, required: true },
	deliveryAddress: { type: String, required: true },
	scheduledDate: { type: Date, required: true },
	scheduledTimeStart: { type: String, required: true },
	scheduledTimeEnd: { type: String, required: true },
	status: {
		type: String,
		enum: [
			'Pending',
			'Confirmed',
			'Completed',
			'Cancelled',
		],
		default: 'Pending',
	},
	paymentStatus: {
		type: String,
		enum: ['Pending', 'Paid'],
		default: 'Pending',
	},
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Booking', BookingSchema);
