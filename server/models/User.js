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
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      default: 'password123',
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    status: {
      type: String,
      enum: ['Online', 'Offline'],
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
      default: '#00ff73',
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id || ret._id?.toString();
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id || ret._id?.toString();
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
