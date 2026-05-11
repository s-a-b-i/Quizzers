import mongoose from 'mongoose';
import { attachAutoSlug } from '../lib/slugFromName.js';

const subtopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    description: { type: String, default: '' },
    weightage: { type: Number },
    syllabusItem: { type: String, default: '' },
    dependency: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subtopic',
      },
    ],
    isActive: { type: Boolean, default: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

attachAutoSlug(subtopicSchema);
subtopicSchema.index({ topicId: 1 });
subtopicSchema.index({ dependency: 1 });

export default mongoose.model('Subtopic', subtopicSchema);
