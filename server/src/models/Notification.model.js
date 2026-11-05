import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['new_video', 'new_comment', 'comment_reply', 'like', 'new_subscriber', 'live_start'],
      required: true,
    },
    // Polymorphic reference to the related entity
    entityType: {
      type: String,
      enum: ['Video', 'Comment', 'User'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    message: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1 });

// Auto-delete after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('Notification', notificationSchema);
