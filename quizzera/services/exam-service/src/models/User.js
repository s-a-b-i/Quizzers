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

/** Optional mirror in `quizzera_exam` for auth on exam routes. */
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
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'student',
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
