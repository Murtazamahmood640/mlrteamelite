// models/Event.js
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['technical', 'cultural', 'sports', 'workshop', 'seminar', 'competition', 'other']
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String, // e.g., "10:00 AM"
    required: true
  },
  endTime: {
    type: String, // e.g., "12:00 PM"
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  maxSeats: {
    type: Number,
    required: true,
    min: 1
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 0, // 0 means unlimited
    min: 0
  },
  currentBooked: {
    type: Number,
    default: 0
  },
  seatsAvailable: {
    type: Number,
    default: function() {
      return this.maxSeats > 0 ? this.maxSeats - this.currentBooked : 0;
    }
  },
  waitlistEnabled: {
    type: Boolean,
    default: false
  },
  bannerImage: {
    type: String // URL to banner image
  },
  rulebook: {
    type: String // URL to rulebook file
  },
  tags: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'ongoing', 'completed', 'cancelled'],
    default: 'pending'
  },
  // For dynamic capacity: if venue_id is needed, add it; but venue is string here
  // venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' }, // Optional if separate Venue model
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update seatsAvailable on save (virtual or middleware)
eventSchema.pre('save', function(next) {
  if (this.maxSeats > 0) {
    this.seatsAvailable = this.maxSeats - this.currentBooked;
  }
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Event', eventSchema);
