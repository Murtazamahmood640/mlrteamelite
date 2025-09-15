import Event from '../models/event.models.js';
import { buildICS } from '../utils/ics.js';

export const icsForEvent = async (req, res) => {
  const ev = await Event.findById(req.params.eventId);
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  const ics = buildICS({
    title: ev.title,
    description: ev.description,
    location: ev.venue,
    start: ev.date,
    end: ev.date,
    url: `${req.protocol}://${req.get('host')}/events/${ev._id}`
  });
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="event-${ev._id}.ics"`);
  res.send(ics);
};

export const shareMessage = async (req, res) => {
  const ev = await Event.findById(req.params.eventId);
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  const text = `Join ${ev.title} on ${new Date(ev.date).toLocaleDateString()} at ${ev.venue}. Register now!`;
  res.json({ message: text, link: `${req.protocol}://${req.get('host')}/events/${ev._id}` });
};
