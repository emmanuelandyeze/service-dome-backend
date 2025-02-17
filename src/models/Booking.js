import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
	customer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Customer',
		required: true,
	},
	service: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Service',
		required: true,
	},
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor',
		required: true,
	},
	date: { type: Date, required: true },
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
