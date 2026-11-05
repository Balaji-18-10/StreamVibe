import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: [true, 'Video reference is required for chat message'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for chat message'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Chat message content cannot be empty'],
      trim: true,
      maxlength: [500, 'Chat message cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying recent chat history in a video/live session
chatMessageSchema.index({ video: 1, createdAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;
