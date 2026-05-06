import mongoose from 'mongoose';

const { Schema } = mongoose;

export const USER_ROLES = [
  'guest',
  'student',
  'mentor',
  'admin',
  'superAdmin',
  'contentManager',
  'financeManager',
];

export const USER_ACCOUNT_STATUSES = ['active', 'suspended', 'inactive'];

/** User profile DB (`quizzera_users`): onboarding, preferences, and profile fields. */
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
      enum: USER_ROLES,
      default: 'student',
    },
    accountStatus: {
      type: String,
      enum: USER_ACCOUNT_STATUSES,
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
    preferences: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    activitySummary: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
