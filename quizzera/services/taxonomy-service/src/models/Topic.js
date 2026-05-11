import mongoose from 'mongoose';
import { attachAutoSlug } from '../lib/slugFromName.js';

const topicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    description: { type: String, default: '' },
    weightage: { type: Number },
    syllabusItem: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

attachAutoSlug(topicSchema);
topicSchema.index({ subjectId: 1 });

export default mongoose.model('Topic', topicSchema);
