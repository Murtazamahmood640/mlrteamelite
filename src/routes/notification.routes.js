import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { rateLimit } from 'express-rate-limit';
import {
  getNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  getNotificationStats,
  createTestNotification,
  sendBulkNotification
} from '../controllers/notification.controller.js';

// Rate limiters for notification endpoints
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many notification requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const bulkNotificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit bulk notifications to 10 per hour
  message: {
    success: false,
    message: 'Too many bulk notifications, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const r = Router();

// All routes require authentication
r.use(protect);
r.use(notificationLimiter);

// Get user's notifications
r.get('/', getNotifications);

// Get notification statistics
r.get('/stats', getNotificationStats);

// Get specific notification
r.get('/:id', getNotification);

// Mark notification as read
r.patch('/:id/read', markAsRead);

// Delete notification
r.delete('/:id', deleteNotification);

// Mark all notifications as read
r.patch('/read-all', markAllAsRead);

// Delete all read notifications
r.delete('/read-all', deleteReadNotifications);

// Create test notification (development only)
r.post('/test', createTestNotification);

// Send bulk notifications (admin only)
r.post('/bulk', bulkNotificationLimiter, authorize('admin'), sendBulkNotification);

export default r;