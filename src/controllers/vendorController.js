import Category from '../models/Category.js';
import Service from '../models/Service.js';
import User from '../models/User.js';

export const getAllVendors = async (req, res) => {
	try {
		const { category, trending } = req.query;

		// Base filter: Only vendors
		let query = { isVendor: true };

		// Add filters for nested vendorProfile.pages
		if (category) {
			query['vendorProfile.pages.category.name'] = category;
		}

		if (trending === 'true') {
			query['vendorProfile.pages.trending'] = true; // Make sure you actually have a `trending` field in PageSchema
		}

		const vendors = await User.find(query).select(
			'-password',
		);

		res.status(200).json(vendors);
	} catch (error) {
		console.error('Error fetching vendor users:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getAllVendorsPages = async (req, res) => {
	try {
		// Fetch all users who are vendors
		const vendors = await User.find({
			isVendor: true,
		}).select('vendorProfile.pages');

		// Flatten all pages from all vendors
		const allPages = vendors.flatMap((vendor) =>
			vendor.vendorProfile.pages.map((page) => ({
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
};

export const createBusinessPage = async (req, res) => {
	try {
		const vendor = await User.findById(req.user.userId);
		if (!vendor || !vendor.isVendor) {
			return res.status(404).json({
				error: 'Vendor not found or unauthorized',
			});
		}

		// Enforce membership tier page limit
		if (
			vendor.vendorProfile.membershipTier === 'Free' &&
			vendor.vendorProfile.pages.length >= 1
		) {
			return res.status(403).json({
				error:
					'Free-tier vendors can only create one page. Upgrade to Premium for more.',
			});
		}

		// Validate openingHours if provided
		let openingHours = [];
		if (req.body.openingHours) {
			let parsedHours = req.body.openingHours;
			if (typeof parsedHours === 'string') {
				try {
					parsedHours = JSON.parse(parsedHours);
				} catch (e) {
					return res.status(400).json({
						error: 'Invalid openingHours format',
					});
				}
			}
			if (!Array.isArray(parsedHours)) {
				return res
					.status(400)
					.json({ error: 'openingHours must be an array' });
			}

			const validDays = [
				'Monday',
				'Tuesday',
				'Wednesday',
				'Thursday',
				'Friday',
				'Saturday',
				'Sunday',
			];

			for (const entry of parsedHours) {
				if (!validDays.includes(entry.day)) {
					return res
						.status(400)
						.json({ error: `Invalid day: ${entry.day}` });
				}
				if (!entry.openingTime || !entry.closingTime) {
					// Fixed typo: closingTime -> closingTime
					return res.status(400).json({
						error: `Missing openingTime or closingTime for ${entry.day}`,
					});
				}
			}

			openingHours = parsedHours;
		}

		// Handle category - check if it's already an object or needs parsing
		let category;
		try {
			category =
				typeof req.body.category === 'string'
					? JSON.parse(req.body.category)
					: req.body.category;
		} catch (e) {
			return res.status(400).json({
				error: 'Invalid category format',
			});
		}

		// Build new page object
		const newPage = {
			category: category,
			businessName: req.body.businessName,
			storePolicies: req.body.storePolicies,
			location: {
				latitude: req.body.latitude || null,
				longitude: req.body.longitude || null,
				address: req.body.address || '',
			},
			openingHours,
			logo: req.files?.logo ? req.files.logo[0].path : '',
			banner: req.files?.banner
				? req.files.banner[0].path
				: '',
			services: [],
			reviews: [],
		};

		// Push page to vendorProfile.pages
		vendor.vendorProfile.pages.push(newPage);
		await vendor.save();

		res.status(201).json({
			success: true,
			message: 'Business page created successfully',
			page: newPage,
			vendor: vendor,
		});
	} catch (error) {
		console.error('Error creating business page:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const updateBusinessPage = async (req, res) => {
	try {
		const vendor = await User.findById(req.user.userId); // Ensure auth middleware sets req.user

		if (!vendor || !vendor.isVendor) { 
			return res
				.status(404)
				.json({
					error: 'Vendor not found or unauthorized',
				});
		}

		// Find the page
		const page = vendor.vendorProfile.pages.id(
			req.params.pageId,
		);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// ✅ Update basic fields
		if (req.body.businessName)
			page.businessName = req.body.businessName;
		if (req.body.storePolicies)
			page.storePolicies = req.body.storePolicies;
		if (req.body.about) page.about = req.body.about;

		// ✅ Update services

		// ✅ Update category if provided
		if (req.body.category) {
			try {
				page.category = JSON.parse(req.body.category); // category: { name, slug, image }
			} catch (err) {
				return res
					.status(400)
					.json({
						error: 'Invalid category format. Must be JSON.',
					});
			}
		}

		// ✅ Update location if provided
		if (
			req.body.latitude ||
			req.body.longitude ||
			req.body.address
		) {
			page.location = {
				latitude:
					req.body.latitude || page.location.latitude,
				longitude:
					req.body.longitude || page.location.longitude,
				address: req.body.address || page.location.address,
			};
		}

		// ✅ Update opening hours
		if (req.body.openingHours) {
			let parsedHours;
			try {
				parsedHours =
					typeof req.body.openingHours === 'string'
						? JSON.parse(req.body.openingHours)
						: req.body.openingHours;
			} catch {
				return res
					.status(400)
					.json({
						error: 'Invalid JSON format for openingHours',
					});
			}

			if (!Array.isArray(parsedHours)) {
				return res
					.status(400)
					.json({ error: 'openingHours must be an array' });
			}

			const validDays = [
				'Monday',
				'Tuesday',
				'Wednesday',
				'Thursday',
				'Friday',
				'Saturday',
				'Sunday',
			];

			for (const entry of parsedHours) {
				if (!validDays.includes(entry.day)) {
					return res
						.status(400)
						.json({ error: `Invalid day: ${entry.day}` });
				}
				if (!entry.openingTime || !entry.closingTime) {
					return res.status(400).json({
						error: `Missing openingTime or closingTime for ${entry.day}`,
					});
				}
			}

			page.openingHours = parsedHours;
		}

		// ✅ Update images
		if (req.files?.logo) page.logo = req.files.logo[0].path;
		if (req.files?.banner)
			page.banner = req.files.banner[0].path;

		// ✅ Save vendor with updated page
		await vendor.save();

		res.json({
			success: true,
			message: 'Business page updated successfully',
			page,
			vendor
		});
	} catch (error) {
		console.error('Error updating business page:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getSingleBusinessPage = async (req, res) => {
	try {
		const { pageId } = req.params;

		// 🔍 Find vendor with the page
		const vendor = await User.findOne({
			'vendorProfile.pages._id': pageId,
		})
			.select('vendorProfile.pages')
			.lean();

		if (!vendor) {
			return res.status(404).json({ error: 'Page not found' });
		}

		// 🎯 Find the exact page
		const page = vendor.vendorProfile.pages.find(
			(p) => p._id.toString() === pageId,
		);

		if (!page) {
			return res.status(404).json({ error: 'Page not found' });
		}

		// 🔗 Populate service categories
		if (page.services?.length > 0) {
			page.services = await Promise.all(
				page.services.map(async (service) => {
					if (service.category) {
						const category = await Category.findById(service.category).lean();
						if (category) {
							service.category = category;
						}
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
};

export const getVendorFromBusinessPage = async (req, res) => {
	try {
		const { pageId } = req.params;

		// 🔍 Find vendor with the page
		const vendor = await User.findOne({
			'vendorProfile.pages._id': pageId,
		})
			.select('vendorProfile.pages')
			.lean();

		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		res.status(200).json(vendor);
	} catch (error) {
		console.error('Error fetching vendor from business page:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getServicesForPage = async (req, res) => {
	try {
		const { pageId } = req.params;

		// 🔍 Find the vendor that has the specific page
		const vendor = await User.findOne({ 'vendorProfile.pages._id': pageId }).lean();

		if (!vendor) {
			return res.status(404).json({ error: 'Vendor not found' });
		}

		// 🎯 Find the specific page
		const page = vendor.vendorProfile.pages.find(
			(p) => p._id.toString() === pageId,
		);

		if (!page) {
			return res.status(404).json({ error: 'Page not found' });
		}

		// 🔗 Populate category details for each service
		const services = await Promise.all(
			page.services.map(async (service) => {
				let categoryDetails = null;
				if (service.category) {
					const category = await Category.findById(service.category).lean();
					if (category) {
						categoryDetails = {
							id: category._id,
							name: category.name,
						};
					}
				}
				return {
					id: service._id,
					name: service.name,
					description: service.description,
					price: service.price,
					duration: service.duration,
					images: service.images,
					category: categoryDetails,
				};
			}),
		);

		res.status(200).json({ services });
	} catch (error) {
		console.error('Error fetching services:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const updateVendorProfile = async (req, res) => {
	try {
		const vendor = await User.findById(req.user.userId);
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// ✅ Update vendor-level details
		if (req.body.name)
			vendor.name = req.body.name;
		if (req.body.phone) vendor.phone = req.body.phone;

		await vendor.save();

		res.status(200).json({
			success: true,
			message: 'Vendor profile updated',
			vendor,
		});
	} catch (error) {
		console.error('Error updating vendor:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getVendorsByCategory = async (req, res) => {
	try {
		const { category } = req.query;
		if (!category) {
			return res
				.status(400)
				.json({ message: 'Category is required' });
		}

		// Filter vendors whose pages match the category
		const vendors = await User.find({
			'pages.category.name': category,
		}).select(
			'pages.businessName pages.location pages.logo pages.reviews',
		);

		res.status(200).json(vendors);
	} catch (error) {
		console.error(
			'Error fetching vendors by category:',
			error,
		);
		res.status(500).json({ message: 'Server error' });
	}
};

export const getVendorWithPagesAndServices = async (
	req,
	res,
) => {
	try {
		const { id } = req.params;

		const vendor = await User.findById(id).select(
			'-password',
		);
		if (!vendor) {
			return res
				.status(404)
				.json({ message: 'Vendor not found' });
		}

		const services = await Service.find({ vendor: id });

		const pagesWithServices = (vendor.pages || []).map(
			(page) => ({
				...page.toObject(),
				services: services.filter((service) =>
					page.services?.includes(service._id),
				),
			}),
		);

		return res.status(200).json({
			vendor,
			pages: pagesWithServices,
		});
	} catch (error) {
		console.error('Error fetching vendor details:', error);
		return res
			.status(500)
			.json({ message: 'Server error' });
	}
};


export const addServiceToPage = async (req, res) => {
	try {
		const vendorId = req.user.userId;
		const { pageId } = req.params;

		// Find vendor by ID
		const vendor = await User.findById(vendorId);
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Locate specific page using the id() method on the subdocument array
		const page = vendor.vendorProfile.pages.id(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Prepare uploaded images
		const images = req.files.map((file) => ({
			url: file.path,
		}));

		// Build new service
		const newService = {
			name: req.body.name,
			category: req.body.category,
			description: req.body.shortDescription,
			price: req.body.price,
			duration: req.body.duration,
			images,
		};

		// Add to services array of the page
		page.services.push(newService);

		// Save changes
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
};

export const createCategoryForPage = async (req, res) => {
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
		console.error('Error creating category:', error);
		res.status(400).json({ error: error.message });
	}
};

export const getCategoriesForPage = async (req, res) => {
	const { pageId } = req.params;

	try {
		const categories = await Category.find({ pageId });
		res.status(200).json({
			success: true,
			categories,
		});
	} catch (error) {
		console.error('Error fetching categories:', error);
		res.status(400).json({ error: error.message });
	}
};

export const addReviewToPage = async (req, res) => {
	const { pageId } = req.params;
	const { customerId, rating, comment } = req.body;

	try {
		const vendor = await User.findOne({ 'pages._id': pageId });
		if (!vendor) {
			return res.status(404).json({ error: 'Vendor not found' });
		}

		const page = vendor.pages.id(pageId);
		if (!page) {
			return res.status(404).json({ error: 'Page not found' });
		}

		const newReview = {
			customer: customerId,
			rating,
			comment,
		};

		page.reviews.push(newReview);
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
};

export const getReviewsForPage = async (req, res) => {
	const { pageId } = req.params;

	try {
		// Find the vendor that has the specified page
		const vendor = await User.findOne({
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
};

export const getAllReviewsForVendor = async (req, res) => {
	const { vendorId } = req.params;

	try {
		// Find the vendor by ID
		const vendor = await User.findById(vendorId);
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Extract all reviews from all pages
		const allReviews = vendor.pages.flatMap(
			(page) => page.reviews,
		);

		// Return the reviews
		res.status(200).json({
			success: true,
			reviews: allReviews,
		});
	} catch (error) {
		console.error('Error fetching reviews:', error);
		res.status(500).json({ error: 'Server error' });
	}
};