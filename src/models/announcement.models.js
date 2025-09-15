// models/Announcement.js
import mongoose from 'mongoose';

/**
 * @typedef {Object} Announcement
 * @property {string} title - The title of the announcement
 * @property {string} content - The main content of the announcement
 * @property {string} type - Type of announcement (system, targeted, event)
 * @property {mongoose.Schema.Types.ObjectId} createdBy - Admin who created the announcement
 * @property {Array<mongoose.Schema.Types.ObjectId>} targetUsers - Specific users to target (for targeted announcements)
 * @property {Array<mongoose.Schema.Types.ObjectId>} targetRoles - Roles to target (for role-based announcements)
 * @property {Date} expiresAt - Expiration date for the announcement
 * @property {boolean} isActive - Whether the announcement is currently active
 * @property {number} priority - Priority level (1-5, higher is more important)
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */
const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['system', 'targeted', 'event'],
    default: 'system'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  targetRoles: [{
    type: String,
    enum: ['participant', 'organizer', 'admin']
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  // For event-specific announcements
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }
}, {
  timestamps: true
});

// Index for efficient queries
announcementSchema.index({ isActive: 1, expiresAt: 1, priority: -1 });
announcementSchema.index({ type: 1, targetRoles: 1 });
announcementSchema.index({ targetUsers: 1 });
announcementSchema.index({ createdBy: 1, createdAt: -1 });
announcementSchema.index({ priority: -1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to update timestamps
announcementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get active announcements for a user
announcementSchema.statics.getActiveForUser = async function(userId, userRole) {
  const now = new Date();
  const query = {
    isActive: true,
    expiresAt: { $gt: now },
    $or: [
      { type: 'system' },
      { targetUsers: userId },
      { targetRoles: userRole }
    ]
  };

  return this.find(query)
    .populate('createdBy', 'username fullName')
    .populate('eventId', 'title date')
    .sort({ priority: -1, createdAt: -1 });
};

export default mongoose.model('Announcement', announcementSchema);