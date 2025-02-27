// models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
	name: { type: String, required: true },
	pageId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Page',
		required: true,
	},
	// Add other fields as necessary
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
