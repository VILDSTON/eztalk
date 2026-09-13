import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    handle: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    password: {
      type: String,
      select: false, // Защита от утечки в API
    },
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/bottts/svg?seed=EzTalk',
    },
    status: {
      type: String,
      enum: ['Online', 'Offline', 'Away', 'Busy'],
      default: 'Online',
    },
    statusEmoji: {
      type: String,
      default: '🚀',
    },
    customStatusText: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    accentColor: {
      type: String,
      default: '#10B981',
    },
    theme: {
      type: String,
      default: 'neon',
    },
    soundNotifications: {
      type: Boolean,
      default: true,
    },
    desktopNotifications: {
      type: Boolean,
      default: true,
    },
    floatingToasts: {
      type: Boolean,
      default: true,
    },
    callRingtones: {
      type: Boolean,
      default: true,
    },
    enterToSend: {
      type: Boolean,
      default: true,
    },
    compactMode: {
      type: Boolean,
      default: false,
    },
    settings: {
      type: Object,
      default: {},
    },
    drafts: {
      type: Object,
      default: {},
    },
    bio: {
      type: String,
      default: 'Hey there! I am using EzTalk.',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    blockedUsers: {
      type: [String],
      default: [],
    },
    friends: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id || ret._id?.toString();
        delete ret.password; // Гарантированное удаление хэша/пароля
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id || ret._id?.toString();
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 }, { sparse: true });

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
