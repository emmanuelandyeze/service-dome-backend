import express from 'express';
import {
	uploadService,
	uploadVendor,
} from '../middlewares/uploadMiddleware.js';
import {
	addReviewToPage,
	addServiceToPage,
	createBusinessPage,
	createCategoryForPage,
	getAllReviewsForVendor,
	getAllVendors,
	getAllVendorsPages,
	getCategoriesForPage,
	getReviewsForPage,
	getServicesForPage,
	getSingleBusinessPage,
	getVendorFromBusinessPage,
	getVendorsByCategory,
	getVendorWithPagesAndServices,
	updateBusinessPage,
	updateVendorProfile,
} from '../controllers/vendorController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/vendors
 * @desc    Get all vendors (with filters)
 * @access  Public
 */
router.get('/', getAllVendors);

/**
 * @route   GET /api/vendors/pages
 * @desc    Get all vendor pages on the platform
 * @access  Public
 */
router.get('/pages', getAllVendorsPages);

/**
 * @route   POST /api/vendors/pages
 * @desc    Create a new business page
 * @access  Private (Vendor Only)
 */
router.post(
	'/pages',
	uploadVendor.fields([
		{ name: 'logo' },
		{ name: 'banner' },
	]),
	verifyToken,
	createBusinessPage,
);

/**
 * @route   PUT /api/vendors/pages/:pageId
 * @desc    Update a specific business page
 * @access  Private (Vendor Only)
 */
router.put(
	'/pages/:pageId',
	uploadVendor.fields([
		{ name: 'logo' },
		{ name: 'banner' },
	]),
	verifyToken,
	updateBusinessPage,
);

/**
 * @route   GET /api/vendors/pages/:pageId
 * @desc    Fetch a single business page by its ID
 * @access  Public
 */
router.get('/pages/:pageId', getSingleBusinessPage);

/**
 * @route   GET /api/vendors/pages/:pageId/vendor
 * @desc    Fetch a vendor from business page by its ID
 * @access  Public
 */
router.get(
	'/pages/:pageId/vendor',
	getVendorFromBusinessPage,
);

/**
 * @route   GET /api/vendors/pages/:pageId/services
 * @desc    Get services for a specific business page
 * @access  Private (Vendor Only)
 */
// Route to get all services for a specific page with category details
router.get('/pages/:pageId/services', getServicesForPage);

/**
 * @route   PUT /api/vendors/profile
 * @desc    Update Vendor Profile (Account-Level Updates)
 * @access  Private (Vendor Only)
 */
router.put('/profile', updateVendorProfile);

/**
 * @route   GET /api/vendors/pages/category
 * @desc    Fetch vendors by service category
 * @access  Public
 */
router.get('/category', getVendorsByCategory);

/**
 * @route   GET /api/vendors/v/:id
 * @desc    Fetch vendor details along with their business pages & services
 * @access  Public
 */
router.get('/v/:id', getVendorWithPagesAndServices);

/**
 * @route   POST /api/vendors/pages/pageId/services
 * @desc    Route to add a service to a specific page
 * @access  Private
 */
router.post(
	'/pages/:pageId/services',
	uploadService.array('images', 5), // Adjust the limit as needed
	verifyToken,
	addServiceToPage,
);

// Create a new category for a specific page
router.post(
	'/pages/:pageId/categories',
	createCategoryForPage,
);

// Get all categories for a specific page
router.get(
	'/pages/:pageId/categories',
	getCategoriesForPage,
);

/**
 * @route   POST /api/vendors/pages/:pageId/reviews
 * @desc    Add a review to a specific page
 * @access  Public
 */
router.post('/pages/:pageId/reviews', addReviewToPage);

/**
 * @route   GET /api/vendors/pages/:pageId/reviews
 * @desc    Fetch all reviews for a specific page
 * @access  Public
 */
router.get('/pages/:pageId/reviews', getReviewsForPage);

/**
 * @route   GET /api/vendors/:vendorId/reviews
 * @desc    Fetch all reviews for all pages of a vendor
 * @access  Public
 */
router.get('/:vendorId/reviews', getAllReviewsForVendor);

export default router;
