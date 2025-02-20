import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, unique: true, required: true },
	password: { type: String, required: true },
	phone: { type: String, required: true },
	address: { type: String },
	role: { type: String, required: true },
	location: {
		latitude: { type: Number },
		longitude: { type: Number },
		address: { type: String },
	},
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Customer', CustomerSchema);
