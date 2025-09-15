import Event from '../models/event.models.js';
import Registration from '../models/registration.models.js';
import User from '../models/user.models.js';
import Notification from '../models/notification.models.js';
import Attendance from '../models/attendance.models.js';
import { sendEventCreationEmail, sendEventApprovalEmail, sendEventRejectionEmail, sendEventUpdateEmail } from '../services/emailService.js';

export const createEvent = async (req, res) => {
  const body = req.body;
  const event = await Event.create({ ...body, organizer: req.user._id, status: 'pending' });

  // Send email notification to all users asynchronously
  const organizer = await User.findById(req.user._id).select('username email');
  sendEventCreationEmail(event, organizer).catch(err => console.error('Failed to send event creation email:', err));

  // Send real-time notification to all users
  try {
    const io = req.app.get('io');
    const allUsers = await User.find({}, '_id');
    const notificationPromises = allUsers.map(user =>
      Notification.createAndSend(user._id, {
        type: 'event',
        title: 'New Event Created',
        message: `${organizer.username} created a new event: ${event.title}`,
        data: { eventId: event._id },
        priority: 'medium'
      }, io)
    );
    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Failed to send event creation notifications:', error);
  }

  res.status(201).json({ event });
};

export const updateEvent = async (req, res) => {
  const { id } = req.params;
  const allowed = ['title','description','category','date','time','venue','maxSeats','bannerImage','rulebook','waitlistEnabled','status','tags'];
  const updates = {};
  allowed.forEach((f)=>{ if (req.body[f] !== undefined) updates[f]=req.body[f];});
  const event = await Event.findOneAndUpdate({ _id: id, organizer: req.user.role==='organizer'? req.user._id : undefined }, updates, { new: true });

  // Send email notification to registered participants asynchronously
  if (Object.keys(updates).length > 0) {
    const registrations = await Registration.find({ event: id, status: 'approved' }).populate('participant', 'username email');
    const participants = registrations.map(reg => reg.participant);
    if (participants.length > 0) {
      sendEventUpdateEmail(event, participants).catch(err => console.error('Failed to send event update email:', err));
    }
  }

  res.json({ event });
};

export const listEvents = async (req, res) => {
  const { q, category, status, from, to, venue, organizer, minCapacity, maxCapacity, department } = req.query;
  const filter = {};

  // Search functionality
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } }
    ];
  }

  // Basic filters
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (venue) filter.venue = { $regex: venue, $options: 'i' };
  if (organizer) filter.organizer = organizer;
  if (department) filter.department = department;

  // Date range filter
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  // Capacity filters
  if (minCapacity || maxCapacity) {
    filter.maxSeats = {};
    if (minCapacity) filter.maxSeats.$gte = parseInt(minCapacity);
    if (maxCapacity) filter.maxSeats.$lte = parseInt(maxCapacity);
  }

  // For participants and non-auth users, only show approved events
  if (!req.user || req.user.role === 'participant') {
    filter.status = 'approved';
  }

  const events = await Event.find(filter).populate('organizer', 'username fullName department').sort({ date: 1 });
  const withCounts = await Promise.all(events.map(async (e)=>{
    const regCount = await Registration.countDocuments({ event: e._id, status: 'confirmed' });
    const waitCount = await Registration.countDocuments({ event: e._id, status: 'waitlist' });
    return { ...e.toObject(), slotCounts: { confirmed: regCount, waitlist: waitCount }, slotsLeft: e.maxSeats>0? Math.max(e.maxSeats - regCount, 0) : null };
  }));
  res.json({ events: withCounts });
};

export const getEvent = async (req, res) => {
  try {
    console.log('Getting event with ID:', req.params.id);
    const event = await Event.findById(req.params.id).populate('organizer','username fullName');
    console.log('Found event:', event);
    if (!event) {
      console.log('Event not found, returning 404');
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ event });
  } catch (error) {
    console.error('Error in getEvent:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Event not found' });
    }
    throw error;
  }
};

export const approveEvent = async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true }).populate('organizer', 'username email');

  // Send email notification to organizer asynchronously
  sendEventApprovalEmail(event, event.organizer).catch(err => console.error('Failed to send event approval email:', err));

  res.json({ event });
};

export const rejectEvent = async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true }).populate('organizer', 'username email');

  // Send email notification to organizer asynchronously
  sendEventRejectionEmail(event, event.organizer).catch(err => console.error('Failed to send event rejection email:', err));

  res.json({ event });
};

export const cancelEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (req.user.role === 'organizer' && event.organizer.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
  const updatedEvent = await Event.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
  res.json({ event: updatedEvent });
};

export const deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (req.user.role === 'organizer' && event.organizer.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: 'Event deleted' });
};

export const getMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Check if user is the organizer or admin
    if (req.user.role === 'organizer' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const registrations = await Registration.find({ event: id });
    const totalRegistrations = registrations.length;
    const approvedCount = registrations.filter(r => r.status === 'approved').length;
    const pendingRegistrations = registrations.filter(r => r.status === 'pending').length;
    const rejectedRegistrations = registrations.filter(r => r.status === 'rejected').length;
    const views = event.views || 0;

    // Additional metrics
    const approvedRegistrations = await Registration.find({ event: id, status: 'approved' }).populate('participant');
    const participantIds = approvedRegistrations
      .filter(reg => reg.participant && reg.participant._id)
      .map(reg => reg.participant?._id)
      .filter(id => id);

    const attendanceRecords = await Attendance.find({
      event: id,
      participant: { $in: participantIds }
    });

    const presentCount = attendanceRecords.filter(a => a.attended).length;
    const absentCount = attendanceRecords.filter(a => !a.attended).length;

    res.json({
      metrics: {
        totalRegistrations,
        approvedRegistrations: approvedCount,
        pendingRegistrations,
        rejectedRegistrations,
        views,
        presentCount,
        absentCount,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
