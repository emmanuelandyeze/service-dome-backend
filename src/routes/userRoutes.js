import express from 'express';
import {
	getUserProfile,
	updateUserProfile,
	deleteUser,
	getAllUsers,
} from '../controllers/userController.js';
import {
	protectVendor,
	authorizeRoles,
} from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected routes
router.get('/profile', protectVendor, getUserProfile);
router.put('/profile', protectVendor, updateUserProfile);
router.delete('/profile', protectVendor, deleteUser);

// Admin-only routes
router.get(
	'/',
	protectVendor,
	authorizeRoles('admin'),
	getAllUsers,
);

export default router;
