import mongoose from 'mongoose';

const { Schema } = mongoose;

const bookmarkSchema = new Schema(
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
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

bookmarkSchema.index({ userId: 1, mcqId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Bookmark', bookmarkSchema);
