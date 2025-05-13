import express from 'express';
import {
	getUserProfile,
	updateUserProfile,
	deleteUser,
	getAllUsers,
} from '../controllers/userController.js';

const router = express.Router();

// Protected routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.delete('/profile', deleteUser);

// Admin-only routes
router.get('/', getAllUsers);

export default router;
