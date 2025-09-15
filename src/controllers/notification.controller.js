import Notification from '../models/notification.models.js';

/**
 * Get user's notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead, priority } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Build filter
    let filter = {
      recipient: userId,
      expiresAt: { $gt: new Date() }
    };

    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (priority) filter.priority = priority;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get a specific notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ notification });

  } catch (error) {
    console.error('Error fetching notification:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ notification });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark all notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.markAllAsRead(userId);

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete all read notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteReadNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({
      recipient: userId,
      isRead: true
    });

    res.json({
      message: 'Read notifications deleted successfully',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get notification statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, unread, read, byType] = await Promise.all([
      Notification.countDocuments({
        recipient: userId,
        expiresAt: { $gt: new Date() }
      }),
      Notification.getUnreadCount(userId),
      Notification.countDocuments({
        recipient: userId,
        isRead: true,
        expiresAt: { $gt: new Date() }
      }),
      Notification.aggregate([
        { $match: { recipient: userId, expiresAt: { $gt: new Date() } } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      total,
      unread,
      read,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a test notification (for development/testing)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createTestNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = 'system', title = 'Test Notification', message = 'This is a test notification' } = req.body;
    const io = req.app.get('io');

    const notification = await Notification.createAndSend(userId, {
      type,
      title,
      message,
      priority: 'medium'
    }, io);

    res.json({
      message: 'Test notification created and sent',
      notification
    });

  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send notification to multiple users (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sendBulkNotification = async (req, res) => {
  try {
    const { recipientIds, type, title, message, data, priority = 'medium' } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ message: 'Recipient IDs are required' });
    }

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const notifications = [];

    const io = req.app.get('io');
    for (const recipientId of recipientIds) {
      try {
        const notification = await Notification.createAndSend(recipientId, {
          type,
          title,
          message,
          data: data || {},
          priority
        }, io);
        notifications.push(notification);
      } catch (error) {
        console.error(`Error sending notification to ${recipientId}:`, error);
      }
    }

    res.json({
      message: `Notifications sent to ${notifications.length} users`,
      sentCount: notifications.length,
      failedCount: recipientIds.length - notifications.length
    });

  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};