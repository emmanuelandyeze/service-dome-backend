import express from 'express';
import {
	setDeliverySettings,
	getDeliverySettings,
	getVendorDeliverySettings,
} from '../controllers/deliveryController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Set or Update Delivery Settings
router.put(
	'/pages/:pageId/delivery',
	verifyToken,
	setDeliverySettings,
);

// Get Delivery Settings Customer
router.get(
	'/:vendorId/pages/:pageId/delivery',
	getDeliverySettings,
);

// Get Delivery Settings Vendor
router.get(
	'/pages/:pageId/delivery',
	verifyToken,
	getVendorDeliverySettings,
);

export default router;
