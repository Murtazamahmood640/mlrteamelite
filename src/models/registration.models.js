// models/Registration.js
import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
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
  registeredOn: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  icsTicket: {
    type: String, // Store the ICS content for approved registrations
    default: null
  }
}, { timestamps: true });

// Index for querying by event and status
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ event: 1, participant: 1 }, { unique: true });

export default mongoose.model('Registration', registrationSchema);
