import mongoose from 'mongoose';

const TimeSlotSchema = new mongoose.Schema({
	date: { type: Date, required: true }, // Specific day
	startTime: { type: String, required: true }, // e.g., "09:00"
	endTime: { type: String, required: true }, // e.g., "09:30"
	status: {
		type: String,
		enum: ['Available', 'Blocked', 'Booked'],
		default: 'Available',
	},
	blockReason: { type: String }, // Reason for blocking (if any)
});

const DeliverySettingsSchema = new mongoose.Schema({
	enabled: { type: Boolean, default: false }, // Delivery enabled or not
	fixedFee: { type: Number, min: 0, default: 0 }, // Fixed delivery fee
	distanceBased: { type: Boolean, default: false }, // Charge based on distance
	rates: [
		{ distance: { type: Number }, fee: { type: Number } },
	], // Rate per km
	availableZones: [{ type: String }], // Delivery areas
	estimatedTime: { type: String }, // Estimated delivery time
	selfPickup: {
		// Self-pickup settings
		enabled: { type: Boolean, default: false }, // Self-pickup available or not
		location: { type: String }, // Pickup address
		instructions: { type: String }, // Instructions for pickup
	},
});

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

const NotificationSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			enum: ['job', 'payment', 'withdrawal', 'alert'],
			required: true,
		},
		title: { type: String, required: true },
		message: { type: String, required: true },
		time: { type: Date, default: Date.now }, // Save actual time
		read: { type: Boolean, default: false },
	},
	{ _id: false },
);

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
	about: { type: String },
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
	timeSlots: [TimeSlotSchema],
	deliverySettings: DeliverySettingsSchema,
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
	isVendor: { type: Boolean, default: false },
	notifications: [NotificationSchema],

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
	},
	expoPushToken: { type: String },

	createdAt: { type: Date, default: Date.now },
});


UserSchema.methods.toJSON = function () {
	const userObject = this.toObject();

	// Guard against undefined roles
	const roles = userObject.roles || [];

	if (!roles.includes('Vendor')) {
		delete userObject.vendorProfile;
	}
	if (!roles.includes('Customer')) {
		delete userObject.customerProfile;
	}

	delete userObject.password; // optionally hide password too

	return userObject;
};




export default mongoose.model('User', UserSchema);
