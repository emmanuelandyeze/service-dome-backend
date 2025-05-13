import express from 'express';
import {
    getNotifications,
  updateNotification,
  updatePushToken,
} from '../controllers/notificationController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/notifications
router.get('/', verifyToken, getNotifications);

router.post('/token', verifyToken, updatePushToken);

router.patch('/notifications/:index/read', updateNotification)

export default router;
