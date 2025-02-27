import mongoose from 'mongoose';
const { Schema } = mongoose;

const ServiceSchema = new Schema({
	name: { type: String, required: true },
	category: {
		type: String,
		required: true,
	},
	description: { type: String, trim: true },
	price: { type: Number, min: 0 },
	duration: { type: Number, min: 0 }, // Duration in minutes
	images: [
		{
			url: { type: String },
		},
	],
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Service', ServiceSchema);
