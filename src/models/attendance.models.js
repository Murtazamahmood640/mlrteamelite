// models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
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
  attended: {
    type: Boolean,
    default: false
  },
  markedOn: {
    type: Date,
    default: Date.now
  },
  // QR code or other validation can be added if needed
  checkInMethod: {
    type: String, // e.g., 'QR', 'manual'
    default: 'manual'
  }
}, { timestamps: true });

// Unique index to prevent duplicate attendance
attendanceSchema.index({ event: 1, participant: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
