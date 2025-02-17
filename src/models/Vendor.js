import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema({
	ownerName: { type: String, required: true },
	businessName: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	phone: { type: String, required: true },
	logo: { type: String },
	role: { type: String, required: true },
	banner: { type: String },
	location: {
		latitude: { type: Number },
		longitude: { type: Number },
		address: { type: String },
	},
	storePolicies: { type: String },
	reviews: [
		{
			customer: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Customer',
			},
			rating: { type: Number, required: true },
			comment: { type: String },
		},
	],
	membershipTier: {
		type: String,
		enum: ['Free', 'Premium'],
		default: 'Free',
	}, // Membership tier
	subscriptionStatus: {
		type: String,
		enum: ['Active', 'Expired'],
		default: 'Expired',
	}, // Track premium status
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vendor', VendorSchema);
