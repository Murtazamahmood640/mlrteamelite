// models/Notification.js
import mongoose from 'mongoose';

/**
 * @typedef {Object} Notification
 * @property {mongoose.Schema.Types.ObjectId} recipient - User who receives the notification
 * @property {String} type - Type of notification (event, system, announcement, etc.)
 * @property {String} title - Notification title
 * @property {String} message - Notification message
 * @property {Object} data - Additional data related to the notification
 * @property {Boolean} isRead - Whether the notification has been read
 * @property {Date} readAt - When the notification was read
 * @property {String} priority - Priority level (low, medium, high, urgent)
 * @property {Date} expiresAt - When the notification expires
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['event', 'system', 'announcement', 'registration', 'bookmark', 'admin'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ recipient: 1, priority: -1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-expiry

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to create and send notification
notificationSchema.statics.createAndSend = async function(recipientId, notificationData, io = null) {
  try {
    const notification = await this.create({
      recipient: recipientId,
      ...notificationData
    });

    await notification.populate('recipient', 'username email');

    // Send real-time notification via WebSocket if io is available
    if (io) {
      io.to(recipientId.toString()).emit('notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating and sending notification:', error);
    throw error;
  }
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = async function(userId) {
  const now = new Date();
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: now, updatedAt: now }
  );
};

export default mongoose.model('Notification', notificationSchema);