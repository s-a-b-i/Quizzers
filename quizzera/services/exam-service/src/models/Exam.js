import mongoose from 'mongoose';
import { attachAutoSlugFromTitle } from '../lib/slugFromTitle.js';

const { Schema } = mongoose;

const EXAM_TYPES = [
  'mock',
  'dynamic',
  'topic-quiz',
  'timed-practice',
  'syllabus-weighted',
  'weak-area',
  'sectional',
];

const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];
const VISIBILITY = ['public', 'premium', 'hidden'];

const examSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    examType: {
      type: String,
      enum: EXAM_TYPES,
      required: true,
    },
    examBodyId: { type: Schema.Types.ObjectId, ref: 'ExamBody' },
    examTypeId: { type: Schema.Types.ObjectId, ref: 'ExamType' },
    subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    topicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    subtopicIds: [{ type: Schema.Types.ObjectId, ref: 'Subtopic' }],
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      default: 'mixed',
    },
    totalQuestions: { type: Number, required: true, min: 1 },
    durationMinutes: { type: Number, required: true, min: 1 },
    passingScore: { type: Number, default: 50, min: 0, max: 100 },
    visibilityStatus: {
      type: String,
      enum: VISIBILITY,
      default: 'public',
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

attachAutoSlugFromTitle(examSchema);
examSchema.index({ examBodyId: 1, examTypeId: 1 });
examSchema.index({ visibilityStatus: 1, isActive: 1 });

export { EXAM_TYPES, DIFFICULTIES, VISIBILITY };
export default mongoose.model('Exam', examSchema);
