import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    creatorHandle: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    memberHandles: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

groupSchema.index({ memberHandles: 1 });
groupSchema.index({ creatorHandle: 1 });

export const GroupModel = mongoose.models.Group || mongoose.model('Group', groupSchema);
