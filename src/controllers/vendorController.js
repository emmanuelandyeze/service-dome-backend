import Category from '../models/Category.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Page from '../models/Page.js';
import mongoose from 'mongoose';

export const getAllVendors = async (req, res) => {
	try {
		const { category, trending } = req.query;

		// Base filter: Only vendors
		let query = { isVendor: true };

		// Find vendors matching the base query
		const vendors = await User.find(query).select(
			'-password',
		);

		// Get vendor IDs
		const vendorIds = vendors.map((vendor) => vendor._id);

		// Page filter
		let pageQuery = { vendor: { $in: vendorIds } };

		if (category) {
			pageQuery['category.name'] = category;
		}

		if (trending === 'true') {
			pageQuery['trending'] = true; // Ensure that `trending` exists in the new Page schema
		}

		// Find pages associated with the filtered vendors
		const pages = await Page.find(pageQuery).populate(
			'vendor',
			'-password',
		);

		// Combine vendor details with their respective pages
		const vendorData = vendors.map((vendor) => {
			const vendorPages = pages.filter(
				(page) =>
					page.vendor.toString() === vendor._id.toString(),
			);
			return { ...vendor.toObject(), pages: vendorPages };
		});

		res.status(200).json(vendorData);
	} catch (error) {
		console.error('Error fetching vendors:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getAllVendorsPages = async (req, res) => {
	try {
		// Fetch all users who are vendors
		const vendors = await User.find({
			isVendor: true,
		}).select('_id');

		// Extract vendor IDs
		const vendorIds = vendors.map((vendor) => vendor._id);

		// Fetch all pages associated with the vendor IDs
		const allPages = await Page.find({
			vendor: { $in: vendorIds },
		}).populate('vendor', 'name');

		// Format the response
		const formattedPages = allPages.map((page) => ({
			vendorId: page.vendor._id,
			vendorName: page.vendor.name,
			pageId: page._id,
			businessName: page.businessName,
			category: page.category,
			logo: page.logo,
			banner: page.banner,
			location: page.location,
			storePolicies: page.storePolicies,
			reviews: page.reviews,
			services: page.services,
		}));

		res.status(200).json(formattedPages);
	} catch (error) {
		console.error('Error fetching vendor pages:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const createBusinessPage = async (req, res) => {
	try {
		// Fetch the vendor user
		const vendor = await User.findById(req.user.userId);
		if (!vendor || !vendor.isVendor) {
			return res.status(404).json({
				error: 'Vendor not found or unauthorized',
			});
		}

		// Enforce membership tier page limit
		const existingPagesCount = await Page.countDocuments({
			vendor: vendor._id,
		});

		if (
			vendor.vendorProfile.membershipTier === 'Free' &&
			existingPagesCount >= 1
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
					return res.status(400).json({
						error: `Missing openingTime or closingTime for ${entry.day}`,
					});
				}
			}

			openingHours = parsedHours;
		}

		let category = req.body.category;

		if (!category || !category.name || !category.slug) {
			return res.status(400).json({
				error: 'Category must include both name and slug',
			});
		}

		// Create new page object
		const newPage = new Page({
			vendor: vendor._id,
			category: {
				name: category.name,
				slug: category.slug,
			},
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
		});

		// Save the new page
		await newPage.save();

		// Push the new page ID into the vendor's vendorProfile.pages array
		vendor.vendorProfile.pages.push(newPage._id);
		await vendor.save();

		res.status(201).json({
			success: true,
			message: 'Business page created successfully',
			page: newPage,
		});
	} catch (error) {
		console.error('Error creating business page:', error);
		res.status(500).json({ error: 'Server error' });
	}
};
  

export const updateBusinessPage = async (req, res) => {
	try {
		// Find the vendor user
		const vendor = await User.findById(req.user.userId);
		if (!vendor || !vendor.isVendor) {
			return res.status(404).json({
				error: 'Vendor not found or unauthorized',
			});
		}

		// Find the page by ID
		const page = await Page.findById(req.params.pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Verify the vendor owns the page
		if (page.vendor.toString() !== vendor._id.toString()) {
			return res.status(403).json({
				error: 'Unauthorized to update this page',
			});
		}

		// Update basic fields if provided
		if (req.body.businessName)
			page.businessName = req.body.businessName;
		if (req.body.storePolicies)
			page.storePolicies = req.body.storePolicies;
		if (req.body.about) page.about = req.body.about;

		// Update category if provided
		if (req.body.category) {
			try {
				page.category =
					typeof req.body.category === 'string'
						? JSON.parse(req.body.category)
						: req.body.category;
			} catch {
				return res.status(400).json({
					error: 'Invalid category format. Must be JSON.',
				});
			}
		}

		// Update location if provided
		if (
			req.body.latitude ||
			req.body.longitude ||
			req.body.address
		) {
			page.location = {
				latitude:
					req.body.latitude ?? page.location.latitude,
				longitude:
					req.body.longitude ?? page.location.longitude,
				address: req.body.address ?? page.location.address,
			};
		}

		// Update opening hours if provided
		if (req.body.openingHours) {
			let parsedHours;
			try {
				parsedHours =
					typeof req.body.openingHours === 'string'
						? JSON.parse(req.body.openingHours)
						: req.body.openingHours;
			} catch {
				return res.status(400).json({
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

		// Update images if provided
		if (req.files?.logo) page.logo = req.files.logo[0].path;
		if (req.files?.banner)
			page.banner = req.files.banner[0].path;

		// Save updated page
		await page.save();

		res.json({
			success: true,
			message: 'Business page updated successfully',
			page,
		});
	} catch (error) {
		console.error('Error updating business page:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getSingleBusinessPage = async (req, res) => {
	try {
		const { pageId } = req.params;

		// Find the page by ID and populate services and their categories
		const page = await Page.findById(pageId)
			.populate({
				path: 'services',
				populate: { path: 'category' }, // Populate category inside services
			})
			.lean();

		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		res.status(200).json(page);
	} catch (error) {
		console.error('Error fetching business page:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getVendorFromBusinessPage = async (
	req,
	res,
) => {
	try {
		const { pageId } = req.params;

		// 1. Find the page and get vendor reference
		const page = await Page.findById(pageId)
			.select('vendor')
			.lean();

		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// 2. Find the vendor by ID
		const vendor = await User.findById(page.vendor)
			.select('-password') // exclude sensitive data
			.lean();

		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		res.status(200).json(vendor);
	} catch (error) {
		console.error(
			'Error fetching vendor from business page:',
			error,
		);
		res.status(500).json({ error: 'Server error' });
	}
};

export const getServicesForPage = async (req, res) => {
	try {
		const { pageId } = req.params;

		// Find the page by ID and populate vendor minimally if needed
		const page = await Page.findById(pageId).lean();

		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Map over embedded services to populate category details
		const services = await Promise.all(
			page.services.map(async (service) => {
				let categoryDetails = null;
				if (service.category) {
					const category = await Category.findById(
						service.category,
					).lean();
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
		const vendor = await User.findById(
			req.user.userId,
		).select('-password');
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Update fields only if provided and valid
		if (req.body?.name && req.body.name.trim().length > 0) {
			vendor.name = req.body.name.trim();
		}

		if (
			req.body?.phone &&
			/^[\d\+\-\s]{7,15}$/.test(req.body.phone)
		) {
			vendor.phone = req.body.phone.trim();
		}

		await vendor.save();

		res.status(200).json({
			success: true,
			message: 'Vendor profile updated',
			vendor, // you might want to pick specific fields to return here
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
		const { id } = req.params; // Page ID

		// Find the page by its ID and populate vendor details if needed
		const page = await Page.findById(id).populate(
			'vendor',
			'-password -email',
		);

		if (!page) {
			return res
				.status(404)
				.json({ message: 'Page not found' });
		}

		// The services are embedded in the page document, so no extra query needed
		return res.status(200).json({ page });
	} catch (error) {
		console.error('Error fetching page:', error);
		return res
			.status(500)
			.json({ message: 'Server error' });
	}
};

export const addServiceToPage = async (req, res) => {
	try {
		const vendorId = req.user.userId;
		const { pageId } = req.params;

		// Verify vendor exists
		const vendor = await User.findById(vendorId);
		if (!vendor) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Find the page by ID
		const page = await Page.findById(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Check if this page belongs to the vendor
		if (page.vendor.toString() !== vendorId) {
			return res.status(403).json({
				error: 'Unauthorized: You do not own this page',
			});
		}

		// Prepare uploaded images (assuming req.files is set up correctly)
		const images =
			req.files?.map((file) => ({
				url: file.path,
			})) || [];

		// Build new service object
		const newService = {
			name: req.body.name,
			category: req.body.category,
			description: req.body.shortDescription,
			price: req.body.price,
			duration: req.body.duration,
			images,
		};

		// Add new service to the page's services array
		page.services.push(newService);

		// Save the page document
		await page.save();

		res.status(201).json({
			success: true,
			message: 'Service added successfully',
			service: newService,
			page,
		});
	} catch (error) {
		console.error('Error adding service:', error);
		res.status(500).json({ error: 'Server error' });
	}
};

export const createCategoryForPage = async (req, res) => {
	const { pageId } = req.params;
	const { name } = req.body;

	// Validate pageId as ObjectId
	if (!mongoose.Types.ObjectId.isValid(pageId)) {
		return res
			.status(400)
			.json({ error: 'Invalid pageId' });
	}

	try {
		// Optional: verify the page exists
		const pageExists = await Page.exists({ _id: pageId });
		if (!pageExists) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Create the category linked to this page
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
	const customerId = req.user.userId; // assuming auth middleware
	const { rating, comment } = req.body;

	if (!rating || rating < 1 || rating > 5) {
		return res
			.status(400)
			.json({ error: 'Rating must be between 1 and 5' });
	}

	try {
		// Find page by ID
		const page = await Page.findById(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found' });
		}

		// Create new review object
		const newReview = {
			customer: customerId,
			rating,
			comment,
		};

		// Push review into the page's reviews array
		page.reviews.push(newReview);

		// Save updated page
		await page.save();

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
		// Find the page by ID
		const page = await Page.findById(pageId).select(
			'reviews',
		);
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

export const getAllReviewsForVendorPages = async (
	req,
	res,
) => {
	const { vendorId } = req.params;

	try {
		// Find all pages belonging to the vendor
		const pages = await Page.find({
			vendor: vendorId,
		}).select('reviews');

		if (!pages || pages.length === 0) {
			return res
				.status(404)
				.json({ error: 'No pages found for this vendor' });
		}

		// Flatten all reviews from all pages
		const allReviews = pages.flatMap(
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
};

// Create a new time slot
export const createTimeSlot = async (req, res) => {
	try {
		const {pageId} = req.params
		const { day, time, status = 'Available', blockReason } = req.body;

		const page = await Page.findById(pageId);
		if (!page) {
			return res.status(404).json({ error: 'Page not found' });
		}

		// Find the day object within timeSlots or create one
		let daySlot = page.timeSlots.find((slot) => slot.day === day);
		if (!daySlot) {
			daySlot = { day, slots: [] };
			page.timeSlots.push(daySlot);
		}

		// Add the new time slot
		daySlot.slots.push({ time, status, blockReason });
		await page.save();

		return res.status(201).json({ message: 'Time slot created', page });
	} catch (error) {
		console.error('Error creating time slot:', error);
		return res.status(500).json({ error: 'Server error' });
	}
};

// Update an existing time slot
export const updateTimeSlot = async (req, res) => {
	try {
		const { pageId } = req.params;
		const { day, time, status, blockReason } = req.body;

		const page = await Page.findById(pageId);
		if (!page) {
			return res.status(404).json({ error: 'Page not found' });
		}

		const daySlot = page.timeSlots.find((slot) => slot.day === day);
		if (!daySlot) {
			return res.status(404).json({ error: 'Time slot not found for the given day' });
		}

		const slot = daySlot.slots.find((s) => s.time === time);
		if (!slot) {
			return res.status(404).json({ error: 'Time slot not found' });
		}

		// Update slot details
		slot.status = status || slot.status;
		slot.blockReason = blockReason || slot.blockReason;
		await page.save();

		return res.status(200).json({ message: 'Time slot updated', page });
	} catch (error) {
		console.error('Error updating time slot:', error);
		return res.status(500).json({ error: 'Server error' });
	}
};

// Delete a time slot
export const deleteTimeSlot = async (req, res) => {
	try {
		const { pageId } = req.params;
		const { day, time } = req.body;

		const page = await Page.findById(pageId);
		if (!page) {
			return res.status(404).json({ error: 'Page not found' });
		}

		const daySlot = page.timeSlots.find((slot) => slot.day === day);
		if (!daySlot) {
			return res.status(404).json({ error: 'Time slot not found for the given day' });
		}

		// Remove the time slot
		daySlot.slots = daySlot.slots.filter((s) => s.time !== time);
		await page.save();

		return res.status(200).json({ message: 'Time slot deleted', page });
	} catch (error) {
		console.error('Error deleting time slot:', error);
		return res.status(500).json({ error: 'Server error' });
	}
};

// Get all time slots for a specific page
export const getTimeSlots = async (req, res) => {
	try {
		const { pageId } = req.params;

		const page = await Page.findById(pageId);
		if (!page) {
			return res.status(404).json({ error: 'Page not found' });
		}

		return res.status(200).json({ timeSlots: page.timeSlots });
	} catch (error) {
		console.error('Error fetching time slots:', error);
		return res.status(500).json({ error: 'Server error' });
	}
};