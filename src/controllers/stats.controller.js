import User from '../models/user.models.js';
import Event from '../models/event.models.js';
import Registration from '../models/registration.models.js';
import Notification from '../models/notification.models.js';
import Certificate from '../models/certificate.models.js';
import Bookmark from '../models/bookmarks.models.js';
import Announcement from '../models/announcement.models.js';
import Attendance from '../models/attendance.models.js';

/**
 * Get public homepage statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPublicStats = async (req, res) => {
  try {
    const [
      totalEvents,
      totalParticipants,
      totalRegistrations,
      approvedEvents
    ] = await Promise.all([
      Event.countDocuments(),
      User.countDocuments({ role: 'participant' }),
      Registration.countDocuments(),
      Event.countDocuments({ status: 'approved' })
    ]);

    res.json({
      events: {
        total: totalEvents,
        approved: approvedEvents
      },
      participants: {
        total: totalParticipants
      },
      registrations: {
        total: totalRegistrations
      }
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get admin dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrganizers,
      totalParticipants,
      totalEvents,
      pendingEvents,
      approvedEvents,
      totalRegistrations,
      pendingRegistrations,
      approvedRegistrations,
      totalAnnouncements,
      activeAnnouncements,
      totalCertificates
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'organizer' }),
      User.countDocuments({ role: 'participant' }),
      Event.countDocuments(),
      Event.countDocuments({ status: 'pending' }),
      Event.countDocuments({ status: 'approved' }),
      Registration.countDocuments(),
      Registration.countDocuments({ status: 'pending' }),
      Registration.countDocuments({ status: 'approved' }),
      Announcement.countDocuments(),
      Announcement.countDocuments({ isActive: true, expiresAt: { $gt: new Date() } }),
      Certificate.countDocuments()
    ]);

    res.json({
      users: {
        total: totalUsers,
        organizers: totalOrganizers,
        participants: totalParticipants
      },
      events: {
        total: totalEvents,
        pending: pendingEvents,
        approved: approvedEvents
      },
      registrations: {
        total: totalRegistrations,
        pending: pendingRegistrations,
        approved: approvedRegistrations
      },
      announcements: {
        total: totalAnnouncements,
        active: activeAnnouncements
      },
      certificates: {
        total: totalCertificates
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get organizer dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getOrganizerStats = async (req, res) => {
  try {
    const organizerId = req.user._id;

    // Get organizer's events first
    const myEvents = await Event.find({ organizer: organizerId });
    const eventIds = myEvents.map(event => event._id);

    const [
      totalEvents,
      totalRegistrations,
      pendingRegistrations,
      approvedRegistrations,
      totalParticipants,
      totalCertificates,
      totalViews,
      attendanceStats
    ] = await Promise.all([
      Event.countDocuments({ organizer: organizerId }),
      Registration.countDocuments({ event: { $in: eventIds } }),
      Registration.countDocuments({ event: { $in: eventIds }, status: 'pending' }),
      Registration.countDocuments({ event: { $in: eventIds }, status: 'approved' }),
      User.countDocuments({ role: 'participant' }),
      Certificate.countDocuments({ event: { $in: eventIds } }),
      Event.aggregate([
        { $match: { organizer: organizerId } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]),
      Attendance.aggregate([
        { $match: { event: { $in: eventIds } } },
        {
          $group: {
            _id: null,
            totalPresent: { $sum: { $cond: ['$attended', 1, 0] } },
            totalAbsent: { $sum: { $cond: ['$attended', 0, 1] } }
          }
        }
      ])
    ]);

    const totalViewsValue = totalViews.length > 0 ? totalViews[0].totalViews : 0;
    const attendanceData = attendanceStats.length > 0 ? attendanceStats[0] : { totalPresent: 0, totalAbsent: 0 };

    res.json({
      events: {
        total: totalEvents,
        myEvents: myEvents.length
      },
      registrations: {
        total: totalRegistrations,
        pending: pendingRegistrations,
        approved: approvedRegistrations
      },
      participants: {
        total: totalParticipants
      },
      certificates: {
        total: totalCertificates
      },
      attendance: {
        present: attendanceData.totalPresent,
        absent: attendanceData.totalAbsent
      },
      views: {
        total: totalViewsValue
      }
    });

  } catch (error) {
    console.error('Error fetching organizer stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get participant dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getParticipantStats = async (req, res) => {
  try {
    const participantId = req.user._id;

    const [
      totalRegistrations,
      approvedRegistrations,
      pendingRegistrations,
      rejectedRegistrations,
      totalBookmarks,
      eventBookmarks,
      mediaBookmarks,
      totalNotifications,
      unreadNotifications,
      totalCertificates,
      completedEvents
    ] = await Promise.all([
      Registration.countDocuments({ participant: participantId }),
      Registration.countDocuments({ participant: participantId, status: 'approved' }),
      Registration.countDocuments({ participant: participantId, status: 'pending' }),
      Registration.countDocuments({ participant: participantId, status: 'rejected' }),
      Bookmark.countDocuments({ user: participantId }),
      Bookmark.countDocuments({ user: participantId, type: 'event' }),
      Bookmark.countDocuments({ user: participantId, type: 'media' }),
      Notification.countDocuments({ recipient: participantId, expiresAt: { $gt: new Date() } }),
      Notification.countDocuments({ recipient: participantId, isRead: false, expiresAt: { $gt: new Date() } }),
      Certificate.countDocuments({ participant: participantId }),
      // Count completed events (approved registrations for events that have passed)
      Registration.aggregate([
        { $match: { participant: participantId, status: 'approved' } },
        {
          $lookup: {
            from: 'events',
            localField: 'event',
            foreignField: '_id',
            as: 'eventData'
          }
        },
        { $unwind: '$eventData' },
        { $match: { 'eventData.date': { $lt: new Date() } } },
        { $count: 'totalCompleted' }
      ])
    ]);

    const completedEventsCount = completedEvents.length > 0 ? completedEvents[0].totalCompleted : 0;

    res.json({
      registrations: {
        total: totalRegistrations,
        approved: approvedRegistrations,
        pending: pendingRegistrations,
        rejected: rejectedRegistrations
      },
      bookmarks: {
        total: totalBookmarks,
        events: eventBookmarks,
        media: mediaBookmarks
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications
      },
      certificates: {
        total: totalCertificates
      },
      completedEvents: {
        total: completedEventsCount
      }
    });

  } catch (error) {
    console.error('Error fetching participant stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};