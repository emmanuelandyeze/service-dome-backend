import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  isPremium: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vendor', VendorSchema);
