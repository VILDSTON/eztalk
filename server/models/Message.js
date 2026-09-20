import mongoose from 'mongoose';
import { encryptMessage, isEncrypted } from '../utils/crypto.js';

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

// Middleware: Автоматическое шифрование текста сообщений и цитат (replyTo) перед сохранением в MongoDB
messageSchema.pre('save', function (next) {
  if (this.text && !isEncrypted(this.text)) {
    this.text = encryptMessage(this.text);
  }
  if (this.replyTo && typeof this.replyTo === 'object' && this.replyTo.text && !isEncrypted(this.replyTo.text)) {
    this.replyTo.text = encryptMessage(this.replyTo.text);
  }
  if (typeof next === 'function') next();
});

messageSchema.pre('insertMany', function (next, docs) {
  const documents = Array.isArray(next) ? next : (Array.isArray(docs) ? docs : []);
  for (const doc of documents) {
    if (doc.text && !isEncrypted(doc.text)) {
      doc.text = encryptMessage(doc.text);
    }
    if (doc.replyTo && typeof doc.replyTo === 'object' && doc.replyTo.text && !isEncrypted(doc.replyTo.text)) {
      doc.replyTo.text = encryptMessage(doc.replyTo.text);
    }
  }
  if (typeof next === 'function') next();
});

messageSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update) {
    if (update.$set) {
      if (update.$set.text && !isEncrypted(update.$set.text)) {
        update.$set.text = encryptMessage(update.$set.text);
      }
      if (update.$set['replyTo.text'] && !isEncrypted(update.$set['replyTo.text'])) {
        update.$set['replyTo.text'] = encryptMessage(update.$set['replyTo.text']);
      }
    } else if (update.text && !isEncrypted(update.text)) {
      update.text = encryptMessage(update.text);
    }
  }
  if (typeof next === 'function') next();
});

export const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);
