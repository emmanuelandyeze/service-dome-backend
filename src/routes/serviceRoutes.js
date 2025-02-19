import express from 'express';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { uploadService } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Create a new service (Vendor only)
router.post(
	'/',
	authMiddleware,
	uploadService.array('itemImages', 10),
	async (req, res) => {
		try {
			const vendor = await Vendor.findById(req.user.id);
			if (!vendor) {
				return res
					.status(404)
					.json({ error: 'Vendor not found' });
			}

			// Free-tier check
			const serviceCount = await Service.countDocuments({
				vendor: req.user.id,
			});
			if (
				vendor.membershipTier === 'Free' &&
				serviceCount >= 1
			) {
				return res.status(403).json({
					error:
						'Free tier can only list one service. Upgrade to Premium.',
				});
			}

			// Extract form data
			const {
				name,
				description,
				price,
				category,
				availability,
			} = req.body;
			let items = JSON.parse(req.body.items || '[]'); // Parse items array from JSON string
			let schedule = req.body.schedule
				? JSON.parse(req.body.schedule)
				: {}; // ✅ Parse schedule

			if (!name || !category) {
				return res.status(400).json({
					error: 'Name and category are required',
				});
			}

			// Attach Cloudinary image URLs to items
			const uploadedImages = req.files.map(
				(file) => file.path,
			); // Cloudinary provides URLs in `file.path`
			items = items.map((item, index) => ({
				...item,
				image: uploadedImages[index] || null, // Assign each uploaded image to its respective item
			}));

			const newService = new Service({
				vendor: req.user.id,
				name,
				description,
				price,
				category,
				items,
				schedule, // ✅ Now it's correctly parsed
				availability: availability ?? true,
			});

			await newService.save();

			res.status(201).json({
				message: 'Service created successfully',
				service: newService,
			});
		} catch (error) {
			console.error('Service Creation Error:', error);
			res.status(500).json({
				error: 'Failed to create service',
				details: error.message,
			});
		}
	},
);



// Fetch all services (optional category filter)
router.get('/', async (req, res) => {
	try {
		const query = req.query.category
			? { category: req.query.category }
			: {};
		const services = await Service.find(query).populate(
			'vendor',
			'businessName',
		);
		res.json(services);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch services' });
	}
});

// Fetch services by vendor
router.get('/vendor/:vendorId', async (req, res) => {
	try {
		const services = await Service.find({
			vendor: req.params.vendorId,
		});
		res.json(services);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch vendor services' });
	}
});

// Fetch a single service by ID
router.get('/:id', async (req, res) => {
	try {
		const service = await Service.findById(req.params.id).populate(
			'vendor',
			'businessName email phone',
		);

		if (!service) {
			return res.status(404).json({ error: 'Service not found' });
		}

		res.json(service);
	} catch (error) {
		console.error('Error fetching service:', error);
		res.status(500).json({ error: 'Failed to fetch service' });
	}
});


// Update a service (Vendor only)
router.put(
	'/:id',
	authMiddleware,
	uploadService.array('itemImages', 10),
	async (req, res) => {
		try {
			const service = await Service.findById(req.params.id);
			if (
				!service ||
				service.vendor.toString() !== req.user.id
			) {
				return res
					.status(403)
					.json({ error: 'Unauthorized' });
			}

			// Parse JSON fields if needed
			let items = req.body.items
				? JSON.parse(req.body.items)
				: service.items;
			let schedule = req.body.schedule
				? JSON.parse(req.body.schedule)
				: service.schedule;

			// Handle image uploads
			const uploadedImages = req.files.map(
				(file) => file.path,
			);
			items = items.map((item, index) => ({
				...item,
				image: uploadedImages[index] || item.image, // Keep old image if no new one uploaded
			}));

			// Sanitize price (cast to number or set to previous value)
			const price =
				req.body.price && !isNaN(req.body.price)
					? Number(req.body.price)
					: service.price;

			// Assign updates
			Object.assign(service, {
				...req.body,
				price, // Use sanitized price value
				items,
				schedule,
				availability:
					req.body.availability ?? service.availability,
			});

			await service.save();
			res.json(service);
		} catch (error) {
			console.error('Error updating service:', error);
			res
				.status(500)
				.json({ error: 'Failed to update service' });
		}
	},
);



// Delete a service (Vendor only)
router.delete('/:id', authMiddleware, async (req, res) => {
	try {
		const service = await Service.findById(req.params.id);

		if (
			!service ||
			service.vendor.toString() !== req.user.id
		) {
			return res
				.status(403)
				.json({ error: 'Unauthorized' });
		}

		await service.deleteOne();
		res.json({ message: 'Service deleted' });
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to delete service' });
	}
});

export default router;
