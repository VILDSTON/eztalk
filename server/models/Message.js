import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: true,
      index: true,
    },
    senderHandle: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    recipientHandle: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    text: {
      type: String,
      default: '',
    },
    attachment: {
      id: String,
      name: String,
      type: { type: String, enum: ['image', 'file'] },
      url: String,
      size: String,
    },
    timestamp: {
      type: String,
      default: 'Sent PM',
    },
    callInfo: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

export const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);
