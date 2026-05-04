import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGO_URI in environment. Set MONGO_URI in .env (see .env.example).');
  }
  await mongoose.connect(uri);
}
