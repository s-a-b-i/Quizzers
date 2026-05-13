import mongoose from 'mongoose';

/**
 * `toJSON` / `toObject` strip `correctAnswer` and `explanation` for public serialization.
 * `find().lean()` does not run those transforms — list/detail handlers strip them explicitly.
 * Answers are returned only from `GET /mcqs/:id/answer` (see `revealMcqAnswer`).
 * `toObjectWithAnswers()` is for create responses and internal use.
 */
const { Schema } = mongoose;

const optionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const examMappingSchema = new Schema(
  {
    examBodyId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamBody',
      required: true,
    },
    examTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamType',
      required: true,
    },
  },
  { _id: false }
);

function optionsLengthValidator(val) {
  return Array.isArray(val) && val.length >= 2 && val.length <= 6;
}

const mcqSchema = new Schema(
  {
    questionStem: { type: String, required: true, trim: true },
    options: {
      type: [optionSchema],
      required: true,
      validate: [optionsLengthValidator, 'options must have between 2 and 6 entries'],
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value) {
          const opts = this.get?.('options') ?? this.options;
          if (!Array.isArray(opts) || opts.length === 0) return true;
          const labels = opts.map((o) => String(o?.label ?? '').trim());
          return labels.includes(String(value ?? '').trim());
        },
        message: 'correctAnswer must match one of the option labels',
      },
    },
    explanation: { type: String, default: '', trim: true },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    topicId: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    subtopicId: {
      type: Schema.Types.ObjectId,
      ref: 'Subtopic',
      required: true,
    },
    examMappings: {
      type: [examMappingSchema],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    source: { type: String, default: '', trim: true },
    tags: [{ type: String, trim: true }],
    reviewStatus: {
      type: String,
      enum: ['draft', 'reviewed', 'approved'],
      default: 'draft',
    },
    /** Default `hidden` until you set visibility to public or premium. */
    visibilityStatus: {
      type: String,
      enum: ['public', 'premium', 'hidden'],
      default: 'hidden',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

function stripSensitive(_doc, ret) {
  if (ret && typeof ret === 'object') {
    delete ret.correctAnswer;
    delete ret.explanation;
  }
  return ret;
}

mcqSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: stripSensitive,
});

mcqSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: stripSensitive,
});

mcqSchema.index({ subjectId: 1 });
mcqSchema.index({ topicId: 1 });
mcqSchema.index({ subtopicId: 1 });
mcqSchema.index({ difficulty: 1 });
mcqSchema.index({ reviewStatus: 1 });
mcqSchema.index({ visibilityStatus: 1 });
mcqSchema.index({ tags: 1 });

/**
 * Full document for admin create responses (includes `correctAnswer` and `explanation`).
 * Default `res.json(doc)` uses `toJSON` and strips those fields.
 */
mcqSchema.methods.toObjectWithAnswers = function toObjectWithAnswers() {
  return this.toObject({ transform: false, versionKey: false });
};

export default mongoose.model('MCQ', mcqSchema);

