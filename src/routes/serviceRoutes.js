import express from 'express';
// Assuming your Page model is exported from '../models/Page.js'
import Page from '../models/Page.js';
import { uploadService } from '../middlewares/uploadMiddleware.js';
// Assuming these are your authentication middleware
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a new service for a vendor's page
// The request body should now include the pageId
router.post(
	'/:pageId/services',
	verifyToken,
	uploadService.array('images', 5),
	async (req, res) => {
		try {
			const { pageId } = req.params;
			const vendorId = req.user.id; // Assuming auth middleware provides req.user.id

			const page = await Page.findById(pageId);
			if (!page) {
				return res
					.status(404)
					.json({ error: 'Page not found.' });
			}

			// Authorization check: Ensure the vendor owns the page
			if (page.vendor.toString() !== vendorId) {
				return res.status(403).json({
					error: 'Unauthorized: You do not own this page.',
				});
			}

			const {
				category,
				name,
				description,
				price,
				duration,
			} = req.body;

			if (!category || !name) {
				return res.status(400).json({
					error: 'Category and name are required.',
				});
			}

			const images = req.files.map((file) => ({
				url: file.path,
			}));

			// Create a new service sub-document
			const newService = {
				category,
				name,
				description,
				price: price || 0,
				duration: duration || 0,
				images,
			};

			page.services.push(newService);
			await page.save();

			// Respond with the newly created service
			const createdService =
				page.services[page.services.length - 1];

			res.status(201).json({
				success: true,
				message: 'Service added successfully',
				service: createdService,
			});
		} catch (error) {
			console.error('Error adding service:', error);
			res.status(500).json({
				error: 'Server error: Failed to add service.',
			});
		}
	},
);

// Fetch all services for a specific vendor's page
// This replaces your original /vendor/:vendorId route with a cleaner design
router.get('/:pageId/services', async (req, res) => {
	try {
		const { pageId } = req.params;
		const page = await Page.findById(pageId).populate({
			path: 'services.category',
			select: 'name', // Populate category name
		});

		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found.' });
		}

		// This endpoint will also handle the category filter
		const categoryFilter = req.query.category;
		let services = page.services;

		if (categoryFilter) {
			services = page.services.filter(
				(service) =>
					service.category.toString() === categoryFilter,
			);
		}

		res.json({ services });
	} catch (error) {
		console.error('Error fetching services:', error);
		res
			.status(500)
			.json({ error: 'Failed to fetch services.' });
	}
});

// Fetch a single service by its ID within a page
router.get(
	'/:pageId/services/:serviceId',
	async (req, res) => {
		try {
			const { pageId, serviceId } = req.params;

			const page = await Page.findById(pageId);
			if (!page) {
				return res
					.status(404)
					.json({ error: 'Page not found.' });
			}

			const service = page.services.id(serviceId);
			if (!service) {
				return res.status(404).json({
					error: 'Service not found on this page.',
				});
			}

			// To populate the category, we'd have to do it manually since it's a subdocument.
			// A simpler approach is to return the service as is.
			res.json({ service });
		} catch (error) {
			console.error('Error fetching service:', error);
			res
				.status(500)
				.json({ error: 'Failed to fetch service.' });
		}
	},
);

// Update a service (Vendor only)
router.put(
	'/:pageId/services/:serviceId',
	verifyToken,
	uploadService.array('images', 5),
	async (req, res) => {
		try {
			const { pageId, serviceId } = req.params;
			const vendorId = req.user.userId;

			const page = await Page.findById(pageId);
			if (!page) {
				return res
					.status(404)
					.json({ error: 'Page not found.' });
			}

			if (page.vendor.toString() !== vendorId) {
				return res.status(403).json({
					error: 'Unauthorized: You do not own this page.',
				});
			}

			const service = page.services.id(serviceId);
			if (!service) {
				return res.status(404).json({
					error: 'Service not found on this page.',
				});
			}

			// Update service fields from req.body
			Object.assign(service, req.body);

			// Handle new image uploads
			if (req.files && req.files.length > 0) {
				const newImages = req.files.map((file) => ({
					url: file.path,
				}));
				service.images = newImages; // Replace old images with new ones
			}

			await page.save();

			res.json({
				success: true,
				message: 'Service updated successfully',
				service,
				page,
			});
		} catch (error) {
			console.error('Error updating service:', error);
			res
				.status(500)
				.json({ error: 'Failed to update service.' });
		}
	},
);

// Delete a service (Vendor only)
router.delete(
	'/:pageId/services/:serviceId',
	verifyToken,
	async (req, res) => {
		try {
			const { pageId, serviceId } = req.params;
			const vendorId = req.user.id;

			const page = await Page.findById(pageId);
			if (!page) {
				return res
					.status(404)
					.json({ error: 'Page not found.' });
			}

			if (page.vendor.toString() !== vendorId) {
				return res.status(403).json({
					error: 'Unauthorized: You do not own this page.',
				});
			}

			// Use the id method to find and remove the sub-document
			const service = page.services.id(serviceId);
			if (!service) {
				return res
					.status(404)
					.json({ error: 'Service not found.' });
			}

			service.remove();
			await page.save();

			res.json({
				message: 'Service deleted successfully.',
			});
		} catch (error) {
			console.error('Error deleting service:', error);
			res
				.status(500)
				.json({ error: 'Failed to delete service.' });
		}
	},
);

export default router;
