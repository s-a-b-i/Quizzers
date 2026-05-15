import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Placeholder exam document; extend when exam generation and attempts are implemented.
 */
const examSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'completed', 'archived'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Exam', examSchema);
