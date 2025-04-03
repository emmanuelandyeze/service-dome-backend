import express from 'express';
import Vendor from '../models/Vendor.js';
import Service from '../models/Service.js';
import cloudinary from '../config/cloudinary.js';
import { protectVendor } from '../middlewares/authMiddleware.js';
import {
	uploadService,
	uploadVendor,
} from '../middlewares/uploadMiddleware.js';
import Category from '../models/Category.js';

const router = express.Router();

/**
 * @route   GET /api/vendors
 * @desc    Get all vendors (with filters)
 * @access  Public
 */
router.get('/', async (req, res) => {
	try {
		const { category, trending } = req.query;
		let query = {};

		// Filter vendors based on business pages' categories
		if (category) query['pages.category'] = category;
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
 * @route   GET /api/vendors/pages
 * @desc    Get all vendor pages on the platform
 * @access  Public
 */
router.get('/pages', async (req, res) => {
	try {
		// Fetch all vendors and extract their pages
		const vendors = await Vendor.find().select('pages');

		// Flatten the pages from all vendors
		const allPages = vendors.flatMap((vendor) =>
			vendor.pages.map((page) => ({
				vendorId: vendor._id,
				pageId: page._id,
				businessName: page.businessName,
				category: page.category,
				logo: page.logo,
				banner: page.banner,
				location: page.location,
				storePolicies: page.storePolicies,
				reviews: page.reviews,
				services: page.services,
			})),
		);

		res.status(200).json(allPages);
	} catch (error) {
		console.error('Error fetching vendor pages:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

/**
 * @route   POST /api/vendors/pages
 * @desc    Create a new business page
 * @access  Private (Vendor Only)
 */
router.post(
	'/pages',
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

			// ✅ Enforce membership limits
			if (
				vendor.membershipTier === 'Free' &&
				vendor.pages.length >= 1
			) {
				return res.status(403).json({
					error:
						'Free-tier vendors can only create one page. Upgrade to Premium for multiple pages.',
				});
			}

			// ✅ Validate openingHours if provided
			let openingHours = [];
			if (req.body.openingHours) {
				if (!Array.isArray(req.body.openingHours)) {
					return res.status(400).json({
						error: 'openingHours must be an array',
					});
				}

				// Validate each day's opening hours
				const validDays = [
					'Monday',
					'Tuesday',
					'Wednesday',
					'Thursday',
					'Friday',
					'Saturday',
					'Sunday',
				];
				for (const entry of req.body.openingHours) {
					if (!validDays.includes(entry.day)) {
						return res.status(400).json({
							error: `Invalid day: ${entry.day}`,
						});
					}
					if (!entry.openingTime || !entry.closingTime) {
						return res.status(400).json({
							error: `Missing openingTime or closingTime for ${entry.day}`,
						});
					}
				}

				openingHours = req.body.openingHours;
			}

			// ✅ Create new page object
			const newPage = {
				category: req.body.category,
				businessName: req.body.businessName,
				storePolicies: req.body.storePolicies,
				location: {
					latitude: req.body.latitude || null,
					longitude: req.body.longitude || null,
					address: req.body.address || '',
				},
				openingHours, // Add openingHours to the new page
				logo: req.files?.logo ? req.files.logo[0].path : '',
				banner: req.files?.banner
					? req.files.banner[0].path
					: '',
				services: [],
				reviews: [],
			};

			// ✅ Add new page to vendor
			vendor.pages.push(newPage);
			await vendor.save();

			res.status(201).json({
				success: true,
				message: 'Business page created successfully',
				page: newPage,
				vendor: {
					id: vendor._id,
					membershipTier: vendor.membershipTier,
					pages: vendor.pages,
				},
			});
		} catch (error) {
			console.error('Error creating business page:', error);
			res.status(500).json({ error: 'Server error' });
		}
	},
);

/**
 * @route   PUT /api/vendors/pages/:pageId
 * @desc    Update a specific business page
 * @access  Private (Vendor Only)
 */
router.put(
	'/pages/:pageId',
	protectVendor,
	uploadVendor.fields([
		{ name: 'logo' },
		{ name: 'banner' },
	]),
	async (req, res) => {
		try {
			console.log(req.body);
			const vendor = await Vendor.findById(req.vendor.id);
			if (!vendor)
				return res
					.status(404)
					.json({ error: 'Vendor not found' });

			const page = vendor.pages.id(req.params.pageId);
			if (!page)
				return res
					.status(404)
					.json({ error: 'Page not found' });


			// ✅ Update page details only if provided
			if (req.body.businessName)
				page.businessName = req.body.businessName;
			if (req.body.category)
				page.category = req.body.category;
			if (req.body.storePolicies)
				page.storePolicies = req.body.storePolicies;
			if (
				req.body.longitude ||
				req.body.latitude ||
				req.body.address
			) {
				page.location = {
					latitude: req.body.latitude,
					longitude: req.body.longitude,
					address:
						req.body.address || page.location?.address,
				};
			}

			// ✅ Update openingHours if provided
			if (req.body.openingHours) {
				console.log(
					'Raw openingHours:',
					req.body.openingHours,
				);

				try {
					req.body.openingHours = JSON.parse(
						req.body.openingHours,
					); // ✅ Convert to array
				} catch (error) {
					return res.status(400).json({
						error: 'Invalid JSON format for openingHours',
					});
				}

				// Validate openingHours structure
				if (!Array.isArray(req.body.openingHours)) {
					return res.status(400).json({
						error: 'openingHours must be an array',
					});
				}

				// Validate each day's opening hours
				const validDays = [
					'Monday',
					'Tuesday',
					'Wednesday',
					'Thursday',
					'Friday',
					'Saturday',
					'Sunday',
				];
				for (const entry of req.body.openingHours) {
					if (!validDays.includes(entry.day)) {
						console.log(`Invalid day: ${entry.day}`);
						return res
							.status(400)
							.json({ error: `Invalid day: ${entry.day}` });
					}
					if (!entry.openingTime || !entry.closingTime) {
						console.log(
							`Missing openingTime or closingTime for ${entry.day}`,
						);
						return res.status(400).json({
							error: `Missing openingTime or closingTime for ${entry.day}`,
						});
					}
				}

				// ✅ Assign parsed array
				page.openingHours = req.body.openingHours;
			}

			// ✅ Update images if provided
			if (req.files?.logo)
				page.logo = req.files.logo[0].path;
			if (req.files?.banner)
				page.banner = req.files.banner[0].path;

			await vendor.save();
			res.json({
				success: true,
				message: 'Business page updated',
				page,
				vendor,
			});
		} catch (error) {
			console.error('Error updating business page:', error);
			res.status(500).json({ error: 'Server error' });
		}
	},
);

/**
 * @route   GET /api/vendors/pages/:pageId
 * @desc    Fetch a single business page by its ID
 * @access  Public
 */
router.get('/pages/:pageId', async (req, res) => {
	try {
		const { pageId } = req.params;

		// Find the vendor that has the page
		const vendor = await Vendor.findOne({
			'pages._id': pageId,
		})
			.select('pages')
			.lean();

		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Find the specific page
		const page = vendor.pages.find(
			(p) => p._id.toString() === pageId,
		);

		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Populate the category details for each service
		if (page.services && page.services.length > 0) {
			page.services = await Promise.all(
				page.services.map(async (service) => {
					const serviceCategory = await Category.findById(
						service.category,
					).lean();
					console.log(serviceCategory);
					if (serviceCategory) {
						service.category = serviceCategory; // Replace category ID with category object
					}
					return service;
				}),
			);
		}

		res.status(200).json(page);
	} catch (error) {
		console.error('Error fetching business page:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

/**
 * @route   GET /api/vendors/pages/:pageId/services
 * @desc    Get services for a specific business page
 * @access  Private (Vendor Only)
 */
// Route to get all services for a specific page with category details
router.get('/pages/:pageId/services', async (req, res) => {
	try {
		const { pageId } = req.params;

		// Find the vendor that has the specified page
		const vendor = await Vendor.findOne({
			'pages._id': pageId,
		}).populate('pages.services.category');
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Find the specific page by ID
		const page = vendor.pages.id(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Extract services with populated category details
		const services = page.services.map((service) => ({
			id: service._id,
			name: service.name,
			description: service.description,
			price: service.price,
			duration: service.duration,
			images: service.images,
			category: service.category
				? {
						id: service.category._id,
						name: service.category.name,
				  }
				: null,
		}));

		res.status(200).json({ services });
	} catch (error) {
		console.error('Error fetching services:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

/**
 * @route   PUT /api/vendors/profile
 * @desc    Update Vendor Profile (Account-Level Updates)
 * @access  Private (Vendor Only)
 */
router.put('/profile', protectVendor, async (req, res) => {
	try {
		const vendor = await Vendor.findById(req.vendor.id);
		if (!vendor)
			return res
				.status(404)
				.json({ error: 'Vendor not found' });

		// ✅ Update vendor account details (not pages)
		if (req.body.ownerName)
			vendor.ownerName = req.body.ownerName;
		if (req.body.phone) vendor.phone = req.body.phone;

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
});

/**
 * @route   GET /api/vendors/pages/category
 * @desc    Fetch vendors by service category
 * @access  Public
 */
router.get('/category', async (req, res) => {
	try {
		const { category } = req.query;
		if (!category)
			return res
				.status(400)
				.json({ message: 'Category is required' });

		// Fetch vendors whose pages contain the requested category
		const vendors = await Vendor.find({
			'pages.category.name': category,
		}).select(
			'pages.businessName pages.location pages.logo pages.reviews',
		);

		res.status(200).json(vendors);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Server error' });
	}
});

/**
 * @route   GET /api/vendors/v/:id
 * @desc    Fetch vendor details along with their business pages & services
 * @access  Public
 */
router.get('/v/:id', async (req, res) => {
	try {
		const { id } = req.params;

		// Fetch the vendor details
		const vendor = await Vendor.findById(id).select(
			'-password',
		);
		if (!vendor)
			return res
				.status(404)
				.json({ message: 'Vendor not found' });

		// Fetch services linked to vendor's pages
		const services = await Service.find({ vendor: id });

		// Map services to respective business pages
		const pagesWithServices = vendor.pages.map((page) => ({
			...page.toObject(),
			services: services.filter((service) =>
				page.services.includes(service._id),
			),
		}));

		return res
			.status(200)
			.json({ vendor, pages: pagesWithServices });
	} catch (error) {
		console.error('Error fetching vendor details:', error);
		return res
			.status(500)
			.json({ message: 'Server error' });
	}
});

/**
 * @route   POST /api/vendors/pages/pageId/services
 * @desc    Route to add a service to a specific page
 * @access  Private
 */
router.post(
	'/pages/:pageId/services',
	protectVendor,
	uploadService.array('images', 5), // Adjust the limit as needed
	async (req, res) => {
		try {
			const vendorId = req.vendor.id;
			const { pageId } = req.params;

			// Find the vendor by ID
			const vendor = await Vendor.findById(vendorId);
			if (!vendor) {
				return res
					.status(404)
					.json({ error: 'Vendor not found' });
			}

			// Find the specific page by ID
			const page = vendor.pages.id(pageId);
			if (!page) {
				return res
					.status(404)
					.json({ error: 'Page not found' });
			}

			// Prepare images array
			const images = req.files.map((file) => ({
				url: file.path,
			}));

			// Create new service
			const newService = {
				name: req.body.name,
				category: req.body.category,
				description: req.body.shortDescription,
				price: req.body.price,
				duration: req.body.duration,
				images: images,
			};

			// Add the new service to the page's services array
			page.services.push(newService);

			// Save the updated vendor document
			await vendor.save();

			res.status(201).json({
				success: true,
				message: 'Service added successfully',
				service: newService,
				page,
				vendor,
			});
		} catch (error) {
			console.error('Error adding service:', error);
			res.status(500).json({ error: 'Server error' });
		}
	},
);

// Create a new category for a specific page
router.post(
	'/pages/:pageId/categories',
	async (req, res) => {
		const { pageId } = req.params;
		const { name } = req.body;

		try {
			const category = new Category({ name, pageId });
			await category.save();
			res.status(201).json({
				success: true,
				message: 'Category created successfully',
				category,
				pageId,
			});
		} catch (error) {
			res.status(400).json({ error: error.message });
		}
	},
);

// Get all categories for a specific page
router.get(
	'/pages/:pageId/categories',
	async (req, res) => {
		const { pageId } = req.params;

		try {
			const categories = await Category.find({ pageId });
			res.status(200).json({
				categories,
				success: true,
			});
		} catch (error) {
			res.status(400).json({ error: error.message });
		}
	},
);

/**
 * @route   POST /api/vendors/pages/:pageId/reviews
 * @desc    Add a review to a specific page
 * @access  Public
 */
router.post('/pages/:pageId/reviews', async (req, res) => {
	const { pageId } = req.params;
	const { customerId, rating, comment } = req.body;

	try {
		// Find the vendor that has the specified page
		const vendor = await Vendor.findOne({
			'pages._id': pageId,
		});
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Find the specific page by ID
		const page = vendor.pages.id(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Create a new review
		const newReview = {
			customer: customerId,
			rating,
			comment,
		};

		// Add the review to the page's reviews array
		page.reviews.push(newReview);

		// Save the updated vendor document
		await vendor.save();

		res.status(201).json({
			success: true,
			message: 'Review added successfully',
			review: newReview,
		});
	} catch (error) {
		console.error('Error adding review:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

/**
 * @route   GET /api/vendors/pages/:pageId/reviews
 * @desc    Fetch all reviews for a specific page
 * @access  Public
 */
router.get('/pages/:pageId/reviews', async (req, res) => {
	const { pageId } = req.params;

	try {
		// Find the vendor that has the specified page
		const vendor = await Vendor.findOne({
			'pages._id': pageId,
		});
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Find the specific page by ID
		const page = vendor.pages.id(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Return the reviews for the page
		res.status(200).json({
			success: true,
			reviews: page.reviews,
		});
	} catch (error) {
		console.error('Error fetching reviews:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

/**
 * @route   GET /api/vendors/:vendorId/reviews
 * @desc    Fetch all reviews for all pages of a vendor
 * @access  Public
 */
router.get('/:vendorId/reviews', async (req, res) => {
	const { vendorId } = req.params;

	try {
		// Find the vendor by ID
		const vendor = await Vendor.findById(vendorId);
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Extract all reviews from all pages
		const allReviews = vendor.pages.flatMap(
			(page) => page.reviews,
		);

		res.status(200).json({
			success: true,
			reviews: allReviews,
		});
	} catch (error) {
		console.error('Error fetching reviews:', error);
		res.status(500).json({ error: 'Server error' });
	}
});


export default router;
