import Announcement from '../models/announcement.models.js';
import User from '../models/user.models.js';

/**
 * Create a new announcement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, targetUsers, targetRoles, expiresAt, priority, eventId } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Validate type
    if (type && !['system', 'targeted', 'event'].includes(type)) {
      return res.status(400).json({ message: 'Invalid announcement type' });
    }

    // Validate priority
    if (priority && (priority < 1 || priority > 5)) {
      return res.status(400).json({ message: 'Priority must be between 1 and 5' });
    }

    // Validate target users exist if provided
    if (targetUsers && targetUsers.length > 0) {
      const existingUsers = await User.find({ _id: { $in: targetUsers } });
      if (existingUsers.length !== targetUsers.length) {
        return res.status(400).json({ message: 'One or more target users do not exist' });
      }
    }

    const announcement = await Announcement.create({
      title,
      content,
      type: type || 'system',
      createdBy: req.user._id,
      targetUsers: targetUsers || [],
      targetRoles: targetRoles || [],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      priority: priority || 3,
      eventId
    });

    await announcement.populate('createdBy', 'username fullName');
    await announcement.populate('eventId', 'title date');

    res.status(201).json({ announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all announcements for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status = 'active' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
      query.expiresAt = { $gt: new Date() };
    } else if (status === 'expired') {
      query.expiresAt = { $lte: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // For non-admin users, only show relevant announcements
    if (req.user.role !== 'admin') {
      query.$or = [
        { type: 'system' },
        { targetUsers: req.user._id },
        { targetRoles: req.user.role }
      ];
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'username fullName')
      .populate('eventId', 'title date')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments(query);

    res.json({
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get a specific announcement by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
      .populate('createdBy', 'username fullName')
      .populate('eventId', 'title date')
      .populate('targetUsers', 'username fullName email');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user has permission to view this announcement
    if (req.user.role !== 'admin' && announcement.createdBy._id.toString() !== req.user._id.toString()) {
      const hasAccess = announcement.type === 'system' ||
        announcement.targetUsers.some(user => user._id.toString() === req.user._id.toString()) ||
        announcement.targetRoles.includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ announcement });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update an announcement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.createdBy;
    delete updates.createdAt;

    // Validate priority if provided
    if (updates.priority && (updates.priority < 1 || updates.priority > 5)) {
      return res.status(400).json({ message: 'Priority must be between 1 and 5' });
    }

    // Validate type if provided
    if (updates.type && !['system', 'targeted', 'event'].includes(updates.type)) {
      return res.status(400).json({ message: 'Invalid announcement type' });
    }

    // Validate target users exist if provided
    if (updates.targetUsers && updates.targetUsers.length > 0) {
      const existingUsers = await User.find({ _id: { $in: updates.targetUsers } });
      if (existingUsers.length !== updates.targetUsers.length) {
        return res.status(400).json({ message: 'One or more target users do not exist' });
      }
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'username fullName')
      .populate('eventId', 'title date')
      .populate('targetUsers', 'username fullName email');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ announcement });
  } catch (error) {
    console.error('Error updating announcement:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete an announcement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Toggle announcement active status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const toggleAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    await announcement.populate('createdBy', 'username fullName');
    await announcement.populate('eventId', 'title date');

    res.json({
      announcement,
      message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling announcement status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get active announcements for the current user (simplified endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.getActiveForUser(req.user._id, req.user.role);

    res.json({ announcements });
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};