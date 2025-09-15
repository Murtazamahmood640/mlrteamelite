import Certificate from '../models/certificate.models.js';
import Attendance from '../models/attendance.models.js';

export const requestCertificate = async (req, res) => {
  const { eventId } = req.body;
  const userId = req.user._id;

  // Check if user attended the event
  const attendance = await Attendance.findOne({ event: eventId, participant: userId, attended: true });
  if (!attendance) {
    return res.status(403).json({ message: 'You did not attend this event' });
  }

  // Check if certificate already exists
  const existingCert = await Certificate.findOne({ event: eventId, participant: userId });
  if (existingCert) {
    if (existingCert.status === 'issued') {
      return res.status(400).json({ message: 'Certificate already issued' });
    }
    return res.status(200).json({ message: 'Certificate request already submitted' });
  }

  // Create certificate request
  const cert = new Certificate({
    event: eventId,
    participant: userId,
    status: 'requested',
    certificateUrl: '' // Will be set when issued
  });
  await cert.save();

  res.status(201).json({ message: 'Certificate request submitted successfully', certificate: cert });
};

export const getAttendedEvents = async (req, res) => {
  const userId = req.user._id;
  const attendedEvents = await Attendance.find({ participant: userId, attended: true }).populate('event', 'title date location');
  res.json({ events: attendedEvents.map(a => a.event) });
};

export const issueCertificate = async (req, res) => {
  const { eventId, participantId, certificateUrl, feePaid = false } = req.body;
  const cert = await Certificate.findOneAndUpdate(
    { event: eventId, participant: participantId },
    { certificateUrl, feePaid },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ certificate: cert });
};

export const myCertificates = async (req, res) => {
  const list = await Certificate.find({ participant: req.user._id });
  res.json({ certificates: list });
};
