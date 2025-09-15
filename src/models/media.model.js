// models/Media.js
import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: false // Make optional for gallery items
  },
  fileType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: false
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Gallery-specific fields
  title: {
    type: String,
    trim: true,
    required: false
  },
  description: {
    type: String,
    trim: true,
    required: false
  },
  category: {
    type: String,
    enum: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'dining_room', 'office', 'outdoor', 'other'],
    default: 'other'
  },
  style: {
    type: String,
    enum: ['modern', 'contemporary', 'traditional', 'minimalist', 'industrial', 'scandinavian', 'bohemian', 'rustic', 'art_deco', 'mid_century', 'other'],
    default: 'modern'
  },
  tags: [{
    type: String,
    trim: true
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  colorPalette: [{
    type: String // Hex color codes
  }],
  // Legacy field for backward compatibility
  caption: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Indexes for better performance
mediaSchema.index({ category: 1, style: 1 });
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ isFeatured: 1 });
mediaSchema.index({ createdAt: -1 });

export default mongoose.model('Media', mediaSchema);
