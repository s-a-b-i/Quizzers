import mongoose from 'mongoose';
import { attachAutoSlug } from '../lib/slugFromName.js';

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    examBodyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamBody',
      default: null,
    },
    examTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamType',
      default: null,
    },
    description: { type: String, default: '' },
    weightage: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

attachAutoSlug(subjectSchema);
subjectSchema.index({ examBodyId: 1 });
subjectSchema.index({ examTypeId: 1 });

export default mongoose.model('Subject', subjectSchema);
