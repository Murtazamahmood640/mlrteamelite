import Feedback from '../models/feedback.models.js';
import { sendFeedbackConfirmationEmail } from '../services/emailService.js';

export const submitFeedback = async (req, res) => {
  const { eventId, rating, comments, componentRatings, attachments } = req.body;
  const fb = await Feedback.findOneAndUpdate(
    { event: eventId, participant: req.user._id },
    { rating, comments, componentRatings, attachments },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Send confirmation email
  try {
    await sendFeedbackConfirmationEmail(req.user, fb);
  } catch (emailError) {
    console.error('Failed to send feedback confirmation email:', emailError);
    // Don't fail the request if email fails
  }

  res.status(201).json({ feedback: fb });
};

export const eventFeedback = async (req, res) => {
  const list = await Feedback.find({ event: req.params.eventId }).populate('participant','username fullName');
  res.json({ feedback: list });
};
