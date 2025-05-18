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

const TimeSlotSchema = new mongoose.Schema({
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
	slots: [
		{
			time: { type: String, required: true }, // Flexible time format (e.g., "07:30", "10:30")
			status: {
				type: String,
				enum: ['Available', 'Blocked', 'Booked'],
				default: 'Available',
			},
			blockReason: { type: String }, // Optional reason for blocking
		},
	],
	createdAt: { type: Date, default: Date.now },
});

const PageSchema = new mongoose.Schema({
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
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
	openingHours: [
		{
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
		},
	],
	timeSlots: [TimeSlotSchema],
	deliverySettings: DeliverySettingsSchema,
	createdAt: { type: Date, default: Date.now },
});

PageSchema.pre('save', async function (next) {
	try {
		if (!this.vendor) return next();

		// Find vendor's membership tier by querying User model
        const User = this.model('User');
        const Page = this.model('Page')
		const vendor = await User.findById(this.vendor).select(
			'vendorProfile',
		);

		if (!vendor) return next(new Error('Vendor not found'));

		if (vendor.vendorProfile.membershipTier === 'Free') {
			// Count existing pages for this vendor
			const pageCount = await Page.countDocuments({
				vendor: this.vendor,
			});

			if (pageCount >= 1 && this.isNew) {
				// Prevent creating more than 1 page for free-tier vendors
				return next(
					new Error(
						'Free-tier vendors can only have one business page.',
					),
				);
			}
		}

		next();
	} catch (err) {
		next(err);
	}
});

export default mongoose.model('Page', PageSchema);