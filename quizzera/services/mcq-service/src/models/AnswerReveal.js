import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Audit trail for MCQ answer reveals (GET /mcqs/:id/answer).
 */
const answerRevealSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mcqId: {
      type: Schema.Types.ObjectId,
      ref: 'MCQ',
      required: true,
    },
    revealedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

answerRevealSchema.index({ userId: 1, revealedAt: -1 });
answerRevealSchema.index({ mcqId: 1, revealedAt: -1 });

export default mongoose.model('AnswerReveal', answerRevealSchema);
