import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tempId: {
      type: String,
      default: null,
    },
    conversationKey: {
      type: String,
      required: true,
      index: true,
    },
    groupId: {
      type: String,
      index: true,
      default: null,
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
      index: true,
      trim: true,
      lowercase: true,
      default: null,
    },
    text: {
      type: String,
      default: '',
    },
    attachment: {
      id: String,
      name: String,
      type: { type: String, enum: ['image', 'file', 'audio', 'video'] },
      url: String,
      size: String,
      duration: Number,
      peaks: [Number],
    },
    replyTo: {
      type: Object,
      default: null,
    },
    callInfo: {
      type: Object,
      default: null,
    },
    reactions: {
      type: Object,
      default: {},
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: String,
      default: null,
    },
    isSecret: {
      type: Boolean,
      default: false,
    },
    forwardRestricted: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'delivered', 'read'],
      default: 'sent',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id || ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Составные индексы для быстрого пагинационного чтения истории
messageSchema.index({ conversationKey: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ tempId: 1 }, { sparse: true });

export const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);
