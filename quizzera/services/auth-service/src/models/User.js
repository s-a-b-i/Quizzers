import mongoose from 'mongoose';

const { Schema } = mongoose;

const ROLES = [
  'guest',
  'student',
  'mentor',
  'admin',
  'superAdmin',
  'contentManager',
  'financeManager',
];

const ACCOUNT_STATUSES = ['active', 'suspended', 'inactive'];

const userSchema = new Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'student',
    },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'active',
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    currentPlanId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
