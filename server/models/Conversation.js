import mongoose from 'mongoose';

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

export const ConversationModel = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
