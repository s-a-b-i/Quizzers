import mongoose from 'mongoose';
import { attachAutoSlug } from '../lib/slugFromName.js';

const examTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    examBodyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamBody',
      required: true,
    },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

attachAutoSlug(examTypeSchema);
examTypeSchema.index({ examBodyId: 1 });

export default mongoose.model('ExamType', examTypeSchema);
