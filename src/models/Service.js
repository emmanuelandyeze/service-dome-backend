import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor',
		required: true,
	}, // Vendor who owns the service
	name: { type: String, required: true }, // Service name (e.g., "Pizza", "Haircut")
	description: { type: String }, // Details about the service
	price: { type: Number, required: true }, // Service price
	category: {
		type: String,
		required: true,
		enum: ['Food', 'Beauty', 'Delivery', 'Other'],
	}, // Type of service

	// Food-specific fields
	menu: [{ name: String, price: Number }], // Menu for food vendors
	deliveryAvailable: { type: Boolean }, // If food vendor offers delivery

	// Beauty-specific fields
	duration: { type: Number }, // Service duration (e.g., 60 minutes for a haircut)

	// Delivery service fields
	deliveryRadius: { type: Number }, // Distance vendor delivers (for food & package delivery)

	images: [{ type: String }], // Images of the service
	availability: { type: Boolean, default: true }, // Whether the service is available
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Service', ServiceSchema);
