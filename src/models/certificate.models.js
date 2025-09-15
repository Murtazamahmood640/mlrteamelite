// models/Certificate.js
import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
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
  certificateUrl: {
    type: String,
    required: true // URL to the generated certificate
  },
  feePaid: {
    type: Boolean,
    default: false // Since payment not implemented, but track if fee details provided
  },
  status: {
    type: String,
    enum: ['requested', 'issued'],
    default: 'issued'
  },
  issuedOn: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Unique index
certificateSchema.index({ event: 1, participant: 1 }, { unique: true });

export default mongoose.model('Certificate', certificateSchema);
