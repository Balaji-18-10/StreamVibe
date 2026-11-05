import mongoose from 'mongoose';

// Polymorphic like — can target videos or comments
const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Target entity
    entityType: {
      type: String,
      enum: ['Video', 'Comment'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType',
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  { timestamps: true }
);

// One like/dislike per user per entity
likeSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });
likeSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model('Like', likeSchema);
