import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Playlist name is required'],
      trim: true,
      maxlength: [150, 'Playlist name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videos: [
      {
        video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
        addedAt: { type: Date, default: Date.now },
        position: { type: Number, default: 0 },
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
    },
    // System playlists (Watch Later, Liked Videos) are auto-created
    isSystem: { type: Boolean, default: false },
    systemType: {
      type: String,
      enum: ['watch_later', 'liked_videos', 'history', null],
      default: null,
    },
    thumbnail: { type: String, default: '' }, // Derived from first video
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

playlistSchema.virtual('videoCount').get(function () {
  return this.videos?.length || 0;
});

playlistSchema.index({ owner: 1 });
playlistSchema.index({ owner: 1, systemType: 1 });

export default mongoose.model('Playlist', playlistSchema);
