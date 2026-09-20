import mongoose from 'mongoose';
import { encryptMessage, isEncrypted } from '../utils/crypto.js';

const conversationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    participants: {
      type: [String], // Array of handles (e.g. ['@user1', '@user2'])
      required: true,
      index: true,
    },
    deletedBy: {
      type: [String], // Array of handles who deleted the chat
      default: [],
    },
    lastMessage: {
      type: Object, // Stores the full message object for preview
      default: null,
    }
  },
  { timestamps: true } // automatically adds createdAt and updatedAt
);

// Optimize queries for finding active chats
conversationSchema.index({ participants: 1, updatedAt: -1 });

// Middleware: Гарантированное шифрование превью последнего сообщения (lastMessage.text и replyTo.text)
conversationSchema.pre('save', function (next) {
  if (this.lastMessage && typeof this.lastMessage === 'object') {
    if (this.lastMessage.text && !isEncrypted(this.lastMessage.text)) {
      this.lastMessage.text = encryptMessage(this.lastMessage.text);
    }
    if (this.lastMessage.replyTo && typeof this.lastMessage.replyTo === 'object' && this.lastMessage.replyTo.text && !isEncrypted(this.lastMessage.replyTo.text)) {
      this.lastMessage.replyTo.text = encryptMessage(this.lastMessage.replyTo.text);
    }
  }
  if (typeof next === 'function') next();
});

conversationSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.lastMessage && typeof update.$set.lastMessage === 'object') {
    const lm = update.$set.lastMessage;
    if (lm.text && !isEncrypted(lm.text)) {
      lm.text = encryptMessage(lm.text);
    }
    if (lm.replyTo && typeof lm.replyTo === 'object' && lm.replyTo.text && !isEncrypted(lm.replyTo.text)) {
      lm.replyTo.text = encryptMessage(lm.replyTo.text);
    }
  }
  if (typeof next === 'function') next();
});

export const ConversationModel = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
