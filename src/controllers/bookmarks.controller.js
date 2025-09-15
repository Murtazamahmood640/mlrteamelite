import User from '../models/user.models.js';
import Event from '../models/event.models.js';
import Media from '../models/media.model.js';

/**
 * Add event to user's bookmarks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addEventBookmark = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already bookmarked
    const user = await User.findById(userId);
    if (user.bookmarkedEvents.includes(eventId)) {
      return res.status(400).json({ message: 'Event already bookmarked' });
    }

    // Add to bookmarks
    user.bookmarkedEvents.push(eventId);
    await user.save();

    res.json({
      message: 'Event bookmarked successfully',
      bookmarks: user.bookmarkedEvents
    });

  } catch (error) {
    console.error('Error adding event bookmark:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Remove event from user's bookmarks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeEventBookmark = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if bookmarked
    const bookmarkIndex = user.bookmarkedEvents.indexOf(eventId);
    if (bookmarkIndex === -1) {
      return res.status(400).json({ message: 'Event not bookmarked' });
    }

    // Remove from bookmarks
    user.bookmarkedEvents.splice(bookmarkIndex, 1);
    await user.save();

    res.json({
      message: 'Event bookmark removed successfully',
      bookmarks: user.bookmarkedEvents
    });

  } catch (error) {
    console.error('Error removing event bookmark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add media item to user's bookmarks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addMediaBookmark = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user._id;

    // Check if media exists
    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ message: 'Media item not found' });
    }

    // Check if already bookmarked
    const user = await User.findById(userId);
    if (user.savedMedia.includes(mediaId)) {
      return res.status(400).json({ message: 'Media item already bookmarked' });
    }

    // Add to bookmarks
    user.savedMedia.push(mediaId);
    await user.save();

    res.json({
      message: 'Media item bookmarked successfully',
      bookmarks: user.savedMedia
    });

  } catch (error) {
    console.error('Error adding media bookmark:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid media ID' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Remove media item from user's bookmarks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeMediaBookmark = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if bookmarked
    const bookmarkIndex = user.savedMedia.indexOf(mediaId);
    if (bookmarkIndex === -1) {
      return res.status(400).json({ message: 'Media item not bookmarked' });
    }

    // Remove from bookmarks
    user.savedMedia.splice(bookmarkIndex, 1);
    await user.save();

    res.json({
      message: 'Media bookmark removed successfully',
      bookmarks: user.savedMedia
    });

  } catch (error) {
    console.error('Error removing media bookmark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get user's bookmarked events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookmarkedEvents = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).populate({
      path: 'bookmarkedEvents',
      options: {
        skip: skip,
        limit: parseInt(limit),
        sort: { date: -1 }
      },
      populate: {
        path: 'organizer',
        select: 'username fullName'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get total count for pagination
    const totalEvents = user.bookmarkedEvents.length;

    res.json({
      events: user.bookmarkedEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalEvents,
        pages: Math.ceil(totalEvents / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching bookmarked events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get user's bookmarked media items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookmarkedMedia = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).populate({
      path: 'savedMedia',
      options: {
        skip: skip,
        limit: parseInt(limit),
        sort: { createdAt: -1 }
      },
      populate: {
        path: 'uploadedBy',
        select: 'username fullName'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get total count for pagination
    const totalMedia = user.savedMedia.length;

    res.json({
      media: user.savedMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalMedia,
        pages: Math.ceil(totalMedia / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching bookmarked media:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Check if event is bookmarked by user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkEventBookmark = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isBookmarked = user.bookmarkedEvents.includes(eventId);

    res.json({ isBookmarked });

  } catch (error) {
    console.error('Error checking event bookmark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Check if media item is bookmarked by user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkMediaBookmark = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isBookmarked = user.savedMedia.includes(mediaId);

    res.json({ isBookmarked });

  } catch (error) {
    console.error('Error checking media bookmark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get user's bookmark statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookmarkStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      totalEvents: user.bookmarkedEvents.length,
      totalMedia: user.savedMedia.length,
      totalBookmarks: user.bookmarkedEvents.length + user.savedMedia.length
    });

  } catch (error) {
    console.error('Error fetching bookmark stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};