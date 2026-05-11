import mongoose from 'mongoose';
import { attachAutoSlug } from '../lib/slugFromName.js';

const examBodySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    country: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

attachAutoSlug(examBodySchema);

export default mongoose.model('ExamBody', examBodySchema);
