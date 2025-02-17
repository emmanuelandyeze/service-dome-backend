import express from 'express';
import Vendor from '../models/Vendor.js';
import cloudinary from '../config/cloudinary.js';
import { protectVendor } from '../middlewares/authMiddleware.js';
import { uploadVendor } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/vendors
 * @desc    Get all vendors (with filters)
 * @access  Public
 */
router.get('/', async (req, res) => {
	try {
		const { category, trending, latitude, longitude } =
			req.query;
		let query = {};

		if (category) query.category = category;
		if (trending === 'true') query.trending = true;

		const vendors = await Vendor.find(query).select(
			'-password',
		);

		res.status(200).json(vendors);
	} catch (error) {
		console.error('Error fetching vendors:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

/**
 * @route   PUT /api/vendors/profile
 * @desc    Update Vendor Profile (Delete Old Images)
 * @access  Private (Vendor Only)
 */
router.put(
	'/profile',
	protectVendor,
	uploadVendor.fields([
		{ name: 'logo' },
		{ name: 'banner' },
	]),
	async (req, res) => {
		try {
			const vendor = await Vendor.findById(req.vendor.id);
			if (!vendor)
				return res
					.status(404)
					.json({ error: 'Vendor not found' });

			// ✅ Check if files exist before attempting to delete
			if (req.files?.logo && vendor.logo) {
				const publicId = vendor.logo
					.split('/')
					.pop()
					.split('.')[0];
				await cloudinary.uploader.destroy(
					`service_dome/vendors/${publicId}`,
				);
			}

			if (req.files?.banner && vendor.banner) {
				const publicId = vendor.banner
					.split('/')
					.pop()
					.split('.')[0];
				await cloudinary.uploader.destroy(
					`service_dome/vendors/${publicId}`,
				);
			}

			// ✅ Update details only if provided
			if (req.body.ownerName)
				vendor.ownerName = req.body.ownerName;
			if (req.body.businessName)
				vendor.businessName = req.body.businessName;
			if (req.body.phone) vendor.phone = req.body.phone;
			if (req.body.storePolicies)
				vendor.storePolicies = req.body.storePolicies;

			// ✅ Update location only if provided
			if (req.body.latitude && req.body.longitude) {
				vendor.location = {
					latitude: req.body.latitude,
					longitude: req.body.longitude,
					address:
						req.body.address || vendor.location?.address,
				};
			}

			// ✅ Update images only if they exist in the request
			if (req.files?.logo)
				vendor.logo = req.files.logo[0].path;
			if (req.files?.banner)
				vendor.banner = req.files.banner[0].path;

			await vendor.save();
			res.json({
				success: true,
				message: 'Vendor profile updated',
				vendor,
			});
		} catch (error) {
			console.error('Error updating vendor:', error);
			res.status(500).json({ error: 'Server error' });
		}
	},
);


router.get('/:id', async (req, res) => {
	try {
		const vendor = await Vendor.findById(
			req.params.id,
		).select('-password');
		if (!vendor)
			return res
				.status(404)
				.json({ error: 'Vendor not found' });

		res.json(vendor);
	} catch (error) {
		console.error('Error fetching vendor:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

export default router;
