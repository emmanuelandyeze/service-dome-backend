import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
	name: { type: String, required: true },
	category: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category',
		required: true,
	},
	description: { type: String, trim: true },
	price: { type: Number, min: 0 },
	duration: { type: Number, min: 0 }, // Duration in minutes
	images: [{ url: { type: String } }],
	createdAt: { type: Date, default: Date.now },
});

const OpeningHoursSchema = new mongoose.Schema({
	day: {
		type: String,
		enum: [
			'Monday',
			'Tuesday',
			'Wednesday',
			'Thursday',
			'Friday',
			'Saturday',
			'Sunday',
		],
		required: true,
	},
	openingTime: { type: String, required: true }, // e.g., "09:00"
	closingTime: { type: String, required: true }, // e.g., "17:00"
	isClosed: { type: Boolean, default: false }, // If the vendor is closed on this day
});

const PageSchema = new mongoose.Schema({
	category: {
		name: { type: String, required: true },
		slug: { type: String, required: true },
		image: { type: String },
	},
	businessName: { type: String, required: true },
	logo: { type: String },
	banner: { type: String },
	services: [ServiceSchema],
	storePolicies: { type: String },
	reviews: [
		{
			customer: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
			rating: { type: Number, required: true },
			comment: { type: String },
		},
	],
	location: {
		latitude: { type: Number },
		longitude: { type: Number },
		address: { type: String },
	},
	openingHours: [OpeningHoursSchema],
	createdAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, unique: true, required: true },
	password: { type: String, required: true },
	phone: { type: String, required: true },
	roles: {
		type: [String],
		enum: ['Customer', 'Vendor'],
		required: true,
	},

	// Customer-Specific Fields
	customerProfile: {
		address: { type: String },
		location: {
			latitude: { type: Number },
			longitude: { type: Number },
			address: { type: String },
		},
	},

	// Vendor-Specific Fields
	vendorProfile: {
		membershipTier: {
			type: String,
			enum: ['Free', 'Premium'],
			default: 'Free',
		},
		subscriptionStatus: {
			type: String,
			enum: ['Active', 'Expired'],
			default: 'Expired',
		},
		pages: [PageSchema],
	},

	createdAt: { type: Date, default: Date.now },
});

// Restrict free-tier vendors to one business page
UserSchema.pre('save', function (next) {
	if (
		this.roles.includes('Vendor') &&
		this.vendorProfile.membershipTier === 'Free' &&
		this.vendorProfile.pages.length > 1
	) {
		const err = new Error(
			'Free-tier vendors can only have one business page.',
		);
		return next(err);
	}
	next();
});

export default mongoose.model('User', UserSchema);
