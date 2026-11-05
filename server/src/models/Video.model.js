import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    // Cloudinary video
    videoFile: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      duration: { type: Number, default: 0 }, // seconds
      format: { type: String, default: '' },
    },
    // Cloudinary thumbnail
    thumbnail: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Categorization
    category: {
      type: String,
      enum: ['Gaming', 'Music', 'Education', 'Entertainment', 'Sports', 'Tech', 'News', 'Travel', 'Food', 'Other'],
      default: 'Other',
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    // Type: regular video or Short (< 60s vertical)
    type: {
      type: String,
      enum: ['video', 'short'],
      default: 'video',
    },

    // Stats (denormalized for read performance)
    views: { type: Number, default: 0, min: 0 },
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },

    // Visibility
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
    },
    isPublished: { type: Boolean, default: false },

    // Processing status
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },

    // Chapters (optional)
    chapters: [
      {
        title: String,
        startTime: Number, // seconds
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────
videoSchema.virtual('durationFormatted').get(function () {
  const d = this.videoFile?.duration || 0;
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor(d % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
});

// ─── Indexes ──────────────────────────────────────────────
videoSchema.index({ owner: 1 });
videoSchema.index({ visibility: 1, isPublished: 1, status: 1 });
videoSchema.index({ visibility: 1, isPublished: 1, views: -1 });
videoSchema.index({ visibility: 1, isPublished: 1, type: 1, createdAt: -1 });
videoSchema.index({ category: 1 });
videoSchema.index({ type: 1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ title: 'text', description: 'text', tags: 'text' }); // Full-text search

export default mongoose.model('Video', videoSchema);
