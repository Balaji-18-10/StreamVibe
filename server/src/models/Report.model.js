import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['Video', 'Comment'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      refPath: 'entityType',
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      enum: ['spam', 'misleading', 'violence', 'harassment', 'copyright', 'other'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    moderationAction: {
      type: String,
      enum: ['none', 'content_removed', 'user_warned', 'dismissed'],
      default: 'none',
    },
    moderatorNotes: {
      type: String,
      maxlength: [1000, 'Moderator notes cannot exceed 1000 characters'],
      default: '',
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to help query active reports by entity
reportSchema.index({ entityType: 1, entityId: 1, status: 1 });
reportSchema.index({ reporter: 1, entityType: 1, entityId: 1, status: 1 });
reportSchema.index({ createdAt: -1 });

export default mongoose.model('Report', reportSchema);
