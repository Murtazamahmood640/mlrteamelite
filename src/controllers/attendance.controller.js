import Attendance from '../models/attendance.models.js';
import Registration from '../models/registration.models.js';
import Event from '../models/event.models.js';

export const markAttendance = async (req, res) => {
  const { eventId, participantId, attended = true } = req.body;
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized to mark attendance for this event' });
  }
  const registration = await Registration.findOne({ event: eventId, participant: participantId });
  if (!registration || registration.status !== 'approved') {
    return res.status(403).json({ message: 'Participant is not approved for this event' });
  }
  const att = await Attendance.findOneAndUpdate({ event: eventId, participant: participantId }, { attended }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ attendance: att });
};

export const eventAttendance = async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized to view attendance for this event' });
  }
  const list = await Attendance.find({ event: req.params.eventId }).populate('participant','username fullName');
  res.json({ attendance: list });
};
