import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor',
		required: true,
	}, // Vendor who owns the service

	name: { type: String, required: true }, // Service name (e.g., "Pizza", "Haircut")
	description: { type: String }, // Service details
	price: { type: Number }, // Service price
	category: {
		type: String,
		required: true,
		enum: [
			'Food',
			'Beauty',
			'Delivery',
			'Cleaning',
			'Other',
		],
	}, // Dynamic service categories

	// Category-Specific Items (For Food, Cleaning, etc.)
	items: [
		{
			name: { type: String }, // Item name (e.g., "Burger", "Room Cleaning")
			price: { type: Number }, // Item price
			image: { type: String }, // Image URL
		},
	],

	// Food-Specific Fields
	deliveryAvailable: { type: Boolean }, // If food vendor offers delivery

	// Beauty-Specific Fields
	duration: { type: Number }, // Service duration (e.g., 60 minutes for a haircut)

	// Cleaning & Beauty Services: Available Days & Time Slots
	schedule: {
		type: Map,
		of: [{ startTime: String, endTime: String }], // Example: { Monday: [{ startTime: "09:00", endTime: "12:00" }] }
	},

	// Delivery Service Fields
	deliveryRadius: { type: Number }, // Distance vendor delivers (for food & package delivery)

	availability: { type: Boolean, default: true }, // Whether the service is available
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Service', ServiceSchema);
