import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['event', 'media']
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance and uniqueness
bookmarkSchema.index({ user: 1, type: 1 });
bookmarkSchema.index({ user: 1, item: 1, type: 1 }, { unique: true });

export default mongoose.model('Bookmark', bookmarkSchema);