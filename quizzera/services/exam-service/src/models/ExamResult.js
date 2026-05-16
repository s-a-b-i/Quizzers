import mongoose from 'mongoose';

const { Schema } = mongoose;

const topicPerformanceSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    correct: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const examResultSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamSession',
      required: true,
      unique: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    score: { type: Number, min: 0, max: 100 },
    passed: { type: Boolean, default: false },
    totalCorrect: { type: Number, default: 0, min: 0 },
    totalWrong: { type: Number, default: 0, min: 0 },
    totalUnattempted: { type: Number, default: 0, min: 0 },
    timeTakenMinutes: { type: Number, min: 0 },
    topicWisePerformance: [topicPerformanceSchema],
    weakAreas: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    recommendations: [{ type: String, trim: true }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

examResultSchema.index({ userId: 1, examId: 1 });
examResultSchema.index({ examId: 1, createdAt: -1 });

export default mongoose.model('ExamResult', examResultSchema);
