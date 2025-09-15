import Registration from '../models/registration.models.js';
import Event from '../models/event.models.js';
import User from '../models/user.models.js';
import { buildICS } from '../utils/ics.js';
import { sendRegistrationApprovalEmail, sendRegistrationRejectionEmail, sendNewRegistrationEmail } from '../services/emailService.js';

async function getCounts(eventId) {
  const approved = await Registration.countDocuments({ event: eventId, status: 'approved' });
  const pending = await Registration.countDocuments({ event: eventId, status: 'pending' });
  return { approved, pending };
}

// Helper function to combine date and time into a Date object
function combineDateTime(date, time) {
  try {
    if (!time || typeof time !== 'string') return null;
    const parts = time.split(' ');
    let timeStr = parts[0];
    let period = parts[1];
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    let hour24 = hours;
    if (period) {
      period = period.toUpperCase();
      if (period === 'PM' && hours !== 12) hour24 = hours + 12;
      else if (period === 'AM' && hours === 12) hour24 = 0;
    } else {
      // Assume 24h format if no period
      hour24 = hours;
    }
    if (hour24 < 0 || hour24 > 23 || minutes < 0 || minutes > 59) return null;
    const combined = new Date(date);
    if (isNaN(combined.getTime())) return null;
    combined.setHours(hour24, minutes, 0, 0);
    return combined;
  } catch (error) {
    console.error('Error in combineDateTime:', error);
    return null;
  }
}

export const registerForEvent = async (req, res) => {
  const { eventId } = req.body;
  const event = await Event.findById(eventId).populate('organizer', 'username email');
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (['cancelled','completed'].includes(event.status)) return res.status(400).json({ message: 'Event not open' });
  const reg = await Registration.create({ event: eventId, participant: req.user._id, status: 'pending' });

  // Send email notification to organizer asynchronously
  const participant = await User.findById(req.user._id).select('username email');
  const populatedReg = { ...reg.toObject(), event, participant };
  sendNewRegistrationEmail(populatedReg, event.organizer).catch(err => console.error('Failed to send new registration email:', err));

  res.status(201).json({ registration: reg, counts: await getCounts(eventId) });
};

export const cancelRegistration = async (req, res) => {
  const { id } = req.params;
  const reg = await Registration.findOneAndUpdate({ _id: id, participant: req.user._id }, { status: 'cancelled' }, { new: true });
  if (!reg) return res.status(404).json({ message: 'Registration not found' });
  res.json({ registration: reg, counts: await getCounts(reg.event) });
};

export const myRegistrations = async (req, res) => {
  const regs = await Registration.find({ participant: req.user._id }).populate('event');
  res.json({ registrations: regs });
};

export const eventRegistrations = async (req, res) => {
  const regs = await Registration.find({ event: req.params.eventId }).populate('participant','username fullName email');
  res.json({ registrations: regs });
};

export const approveRegistration = async (req, res) => {
  try {
    console.log('approveRegistration called for id:', req.params.id);
    const { id } = req.params;
    const reg = await Registration.findById(id).populate('event').populate('participant', 'username email');
    console.log('Registration found:', !!reg);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    console.log('Event populated:', !!reg.event);
    if (!reg.event) return res.status(404).json({ message: 'Event not found' });
    console.log('User:', !!req.user);
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role !== 'admin' && req.user._id.toString() !== reg.event.organizer.toString()) return res.status(403).json({ message: 'Forbidden' });
    // Check available seats
    const approvedCount = await Registration.countDocuments({ event: reg.event._id, status: 'approved' });
    console.log('Approved count:', approvedCount, 'Max seats:', reg.event.maxSeats);
    if (approvedCount >= reg.event.maxSeats) {
      return res.status(400).json({ message: 'No seats available' });
    }
    reg.status = 'approved';

    // Generate ICS ticket for approved registration
    console.log('Event date:', reg.event.date, 'Time:', reg.event.time);
    const startDate = combineDateTime(reg.event.date, reg.event.time);
    console.log('Start date combined:', startDate);
    if (!startDate || isNaN(startDate.getTime())) {
      console.error('Invalid date/time for event:', reg.event.date, reg.event.time);
      return res.status(400).json({ message: 'Invalid event date or time' });
    }
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
    console.log('End date:', endDate);
    const icsContent = buildICS({
      title: reg.event.title,
      description: reg.event.description,
      location: reg.event.venue,
      start: startDate,
      end: endDate,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${reg.event._id}`
    });
    console.log('ICS content generated');
    reg.icsTicket = icsContent;

    await reg.save();
    console.log('Registration saved');

    // Send email notification to participant asynchronously
    // sendRegistrationApprovalEmail(reg).catch(err => console.error('Failed to send registration approval email:', err));

    res.json({ registration: reg });
  } catch (error) {
    console.error('Error in approveRegistration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const downloadTicket = async (req, res) => {
  const { id } = req.params;
  const reg = await Registration.findById(id).populate('event participant', 'username fullName email');
  if (!reg) return res.status(404).json({ message: 'Registration not found' });
  if (reg.participant._id.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
  if (reg.status !== 'approved') return res.status(400).json({ message: 'Ticket only available for approved registrations' });
  if (!reg.icsTicket) return res.status(404).json({ message: 'Ticket not generated' });

  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="${reg.event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ticket.ics"`);
  res.send(reg.icsTicket);
};

export const rejectRegistration = async (req, res) => {
  try {
    console.log('rejectRegistration called for id:', req.params.id);
    const { id } = req.params;
    const reg = await Registration.findById(id).populate('event').populate('participant', 'username email');
    console.log('Registration found:', !!reg);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    if (req.user.role !== 'admin' && req.user._id.toString() !== reg.event.organizer.toString()) return res.status(403).json({ message: 'Forbidden' });
    reg.status = 'rejected';
    await reg.save();
    console.log('Registration saved');

    // Send email notification to participant asynchronously
    sendRegistrationRejectionEmail(reg).catch(err => console.error('Failed to send registration rejection email:', err));

    res.json({ registration: reg });
  } catch (error) {
    console.error('Error in rejectRegistration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAvailableSeats = async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  const approvedCount = await Registration.countDocuments({ event: id, status: 'approved' });
  const available = Math.max(event.maxSeats - approvedCount, 0);
  res.json({ availableSeats: available, maxSeats: event.maxSeats, bookedSeats: approvedCount });
};
