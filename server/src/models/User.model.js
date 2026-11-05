import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    banner: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    bio: {
      type: String,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    // Channel stats (denormalized for performance)
    subscriberCount: { type: Number, default: 0, min: 0 },
    videoCount: { type: Number, default: 0, min: 0 },
    totalViews: { type: Number, default: 0, min: 0 },

    // Social links
    links: {
      website: { type: String, default: '' },
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },

    // Auth
    refreshToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Preferences
    watchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────
userSchema.virtual('channelUrl').get(function () {
  return `/@${this.username}`;
});

// ─── Pre-save: Hash password ──────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Methods ─────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken;
};

userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName,
    email: this.email,
    avatar: this.avatar,
    banner: this.banner,
    bio: this.bio,
    subscriberCount: this.subscriberCount,
    videoCount: this.videoCount,
    totalViews: this.totalViews,
    links: this.links,
    role: this.role || 'user',
    createdAt: this.createdAt,
  };
};

// ─── Indexes ──────────────────────────────────────────────
// Note: username and email unique indexes are defined directly on schema paths
userSchema.index({ displayName: 'text', username: 'text' }); // Full-text search

export default mongoose.model('User', userSchema);
