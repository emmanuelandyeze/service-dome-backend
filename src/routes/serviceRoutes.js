import express from 'express';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import { uploadService } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Create a new service (Vendor only)
// router.post(
// 	'/services',
// 	protectVendor,
// 	uploadService.array('images', 5), // Adjust the limit as needed
// 	async (req, res) => {
// 		try {
// 			// Retrieve the authenticated vendor's ID
// 			const vendorId = req.vendor.id;

// 			// Validate vendor existence
// 			const vendor = await Vendor.findById(vendorId);
// 			if (!vendor) {
// 				return res
// 					.status(404)
// 					.json({ error: 'Vendor not found' });
// 			}

// 			// Extract service details from the request body
// 			const {
// 				category,
// 				name,
// 				shortDescription,
// 				price,
// 				duration,
// 			} = req.body;

// 			// Validate required fields
// 			if (!category || !name) {
// 				return res.status(400).json({
// 					error: 'Category and name are required.',
// 				});
// 			}

// 			// Process uploaded images
// 			const images = req.files.map((file) => ({
// 				url: file.path,
// 				description: file.originalname, // Or any other description logic
// 			}));

// 			// Create a new service instance
// 			const newService = new Service({
// 				vendor: vendorId,
// 				category,
// 				name,
// 				shortDescription,
// 				price: price || undefined,
// 				duration: duration || undefined,
// 				images,
// 			});

// 			// Save the service to the database
// 			await newService.save();

// 			// Respond with the created service
// 			res.status(201).json({
// 				success: true,
// 				message: 'Service added successfully',
// 				service: newService,
// 			});
// 		} catch (error) {
// 			console.error('Error adding service:', error);
// 			res.status(500).json({ error: 'Server error' });
// 		}
// 	},
// );




// Fetch all services (optional category filter)
// router.get('/', async (req, res) => {
// 	try {
// 		const query = req.query.category
// 			? { category: req.query.category }
// 			: {};
// 		const services = await Service.find(query).populate(
// 			'vendor',
// 			'businessName',
// 		);
// 		res.json(services);
// 	} catch (error) {
// 		res
// 			.status(500)
// 			.json({ error: 'Failed to fetch services' });
// 	}
// });

// // Fetch services by vendor
// router.get('/vendor/:vendorId', async (req, res) => {
// 	try {
// 		const services = await Service.find({
// 			vendor: req.params.vendorId,
// 		});
// 		res.json(services);
// 	} catch (error) {
// 		res
// 			.status(500)
// 			.json({ error: 'Failed to fetch vendor services' });
// 	}
// });

// // Fetch a single service by ID
// router.get('/:id', async (req, res) => {
// 	try {
// 		const service = await Service.findById(req.params.id).populate(
// 			'vendor',
// 			'businessName email phone',
// 		);

// 		if (!service) {
// 			return res.status(404).json({ error: 'Service not found' });
// 		}

// 		res.json(service);
// 	} catch (error) {
// 		console.error('Error fetching service:', error);
// 		res.status(500).json({ error: 'Failed to fetch service' });
// 	}
// });


// // Update a service (Vendor only)
// router.put(
// 	'/:id',
// 	authMiddleware,
// 	uploadService.array('itemImages', 10),
// 	async (req, res) => {
// 		try {
// 			const service = await Service.findById(req.params.id);
// 			if (
// 				!service ||
// 				service.vendor.toString() !== req.user.id
// 			) {
// 				return res
// 					.status(403)
// 					.json({ error: 'Unauthorized' });
// 			}

// 			// Parse JSON fields if needed
// 			let items = req.body.items
// 				? JSON.parse(req.body.items)
// 				: service.items;
// 			let schedule = req.body.schedule
// 				? JSON.parse(req.body.schedule)
// 				: service.schedule;

// 			// Handle image uploads
// 			const uploadedImages = req.files.map(
// 				(file) => file.path,
// 			);
// 			items = items.map((item, index) => ({
// 				...item,
// 				image: uploadedImages[index] || item.image, // Keep old image if no new one uploaded
// 			}));

// 			// Sanitize price (cast to number or set to previous value)
// 			const price =
// 				req.body.price && !isNaN(req.body.price)
// 					? Number(req.body.price)
// 					: service.price;

// 			// Assign updates
// 			Object.assign(service, {
// 				...req.body,
// 				price, // Use sanitized price value
// 				items,
// 				schedule,
// 				availability:
// 					req.body.availability ?? service.availability,
// 			});

// 			await service.save();
// 			res.json(service);
// 		} catch (error) {
// 			console.error('Error updating service:', error);
// 			res
// 				.status(500)
// 				.json({ error: 'Failed to update service' });
// 		}
// 	},
// );



// // Delete a service (Vendor only)
// router.delete('/:id', authMiddleware, async (req, res) => {
// 	try {
// 		const service = await Service.findById(req.params.id);

// 		if (
// 			!service ||
// 			service.vendor.toString() !== req.user.id
// 		) {
// 			return res
// 				.status(403)
// 				.json({ error: 'Unauthorized' });
// 		}

// 		await service.deleteOne();
// 		res.json({ message: 'Service deleted' });
// 	} catch (error) {
// 		res
// 			.status(500)
// 			.json({ error: 'Failed to delete service' });
// 	}
// });

export default router;
