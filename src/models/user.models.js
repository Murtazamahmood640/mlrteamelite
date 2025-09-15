import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["participant", "organizer", "admin"],
    default: "participant",
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  mobile: {
    type: String,
    required: false,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  enrollmentNo: {
    type: String,
    trim: true,
    unique: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Additional fields for dashboard features like saved media, bookmarks
  savedMedia: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
  ],
  bookmarkedEvents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  // Profile settings can be handled via updates to this schema
  preferences: {
    notifications: {
      type: Boolean,
      default: true,
    },
    // Other preferences
  },
  // Two-Factor Authentication for admins
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false,
    },
    secret: {
      type: String,
      default: null,
    },
    backupCodes: [{
      type: String,
    }],
    lastVerification: {
      type: Date,
      default: null,
    },
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    }
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
