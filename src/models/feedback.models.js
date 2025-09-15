// models/Feedback.js
import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comments: {
    type: String,
    trim: true
  },
  // For rating specific components: venue, coordination, etc.
  componentRatings: {
    venue: { type: Number, min: 1, max: 5 },
    coordination: { type: Number, min: 1, max: 5 },
    technical: { type: Number, min: 1, max: 5 },
    hospitality: { type: Number, min: 1, max: 5 }
  },
  attachments: [{
    type: String,
    trim: true
  }],
  submittedOn: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Unique index if one feedback per user per event
feedbackSchema.index({ event: 1, participant: 1 }, { unique: true });

export default mongoose.model('Feedback', feedbackSchema);
