import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Cloudinary storage setup for vendor profile images
const vendorStorage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: 'service_dome/vendors',
		allowedFormats: ['jpeg', 'png', 'jpg'],
		transformation: [
			{ width: 500, height: 500, crop: 'limit' },
		], // Resize vendor images
	},
});

// Cloudinary storage setup for service images (multiple images per service)
const serviceStorage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: 'service_dome/services', // Store service images separately
		allowedFormats: ['jpeg', 'png', 'jpg'],
		transformation: [
			{ width: 800, height: 600, crop: 'limit' },
		], // Resize service images
	},
});

// Multer upload middleware
const uploadVendor = multer({ storage: vendorStorage });
const uploadService = multer({ storage: serviceStorage });

export { uploadVendor, uploadService };
