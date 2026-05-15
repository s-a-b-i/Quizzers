import Exam from '../models/Exam.js';

/** Placeholder until exam CRUD and assembly are implemented. */
export async function listExams(_req, res) {
  const exams = await Exam.find().sort({ createdAt: -1 }).limit(50).lean();
  res.json({
    success: true,
    data: { exams, note: 'Exam service scaffold — expand routes and business logic as needed.' },
  });
}
