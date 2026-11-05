import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Notification preference
    notificationLevel: {
      type: String,
      enum: ['all', 'highlights', 'none'],
      default: 'all',
    },
  },
  { timestamps: true }
);

// One subscription per subscriber-channel pair
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });
subscriptionSchema.index({ channel: 1 });
subscriptionSchema.index({ subscriber: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
