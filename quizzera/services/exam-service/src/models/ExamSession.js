import mongoose from 'mongoose';

const { Schema } = mongoose;

const SESSION_STATUSES = ['started', 'in-progress', 'submitted', 'evaluated'];

const answerSchema = new Schema(
  {
    mcqId: { type: Schema.Types.ObjectId, ref: 'MCQ', required: true },
    selectedLabel: { type: String, trim: true, default: '' },
    isCorrect: { type: Boolean },
    timeTakenSeconds: { type: Number, min: 0 },
  },
  { _id: false }
);

const topicPerformanceSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    correct: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const examSessionSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      default: 'started',
    },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    expiresAt: { type: Date },
    mcqIds: [{ type: Schema.Types.ObjectId, ref: 'MCQ' }],
    answers: [answerSchema],
    score: { type: Number, min: 0, max: 100 },
    totalCorrect: { type: Number, default: 0, min: 0 },
    totalWrong: { type: Number, default: 0, min: 0 },
    totalUnattempted: { type: Number, default: 0, min: 0 },
    topicWisePerformance: [topicPerformanceSchema],
    weakAreas: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
  },
  { timestamps: true }
);

examSessionSchema.index({ examId: 1, userId: 1 });
examSessionSchema.index({ userId: 1, status: 1 });
examSessionSchema.index({ expiresAt: 1 });

export { SESSION_STATUSES };
export default mongoose.model('ExamSession', examSessionSchema);
