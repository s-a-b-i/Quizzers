import mongoose from 'mongoose';
import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';
import * as mcqClient from './mcqClient.service.js';
import * as examSessionService from './examSession.service.js';

const WEAK_AREA_DEFAULT_QUESTIONS = 20;
const WEAK_AREA_DEFAULT_DURATION_MINUTES = 30;

function resolveUserObjectId(user) {
  const id = user?._id;
  if (id === undefined || id === null) return null;
  const s = String(id).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

function resolveCreatedBy(user) {
  return resolveUserObjectId(user) ?? undefined;
}

function collectWeakTopicIds(results) {
  const topicIds = new Set();
  for (const result of results) {
    for (const topicId of result.weakAreas ?? []) {
      if (topicId != null) topicIds.add(String(topicId));
    }
  }
  return Array.from(topicIds);
}

/**
 * Build a weak-area exam from the user's last three results and start a session.
 */
export async function generateWeakAreaExam(user, authorization) {
  const userId = resolveUserObjectId(user);
  if (!userId) {
    const err = new Error('User identity required.');
    err.statusCode = 401;
    throw err;
  }

  const recentResults = await ExamResult.find({ userId })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const topicIds = collectWeakTopicIds(recentResults);
  if (topicIds.length === 0) {
    const err = new Error('No weak areas detected yet. Complete at least one exam first.');
    err.statusCode = 400;
    throw err;
  }

  const totalQuestions = WEAK_AREA_DEFAULT_QUESTIONS;
  const mcqs = await mcqClient.fetchMcqsForWeakArea({
    topicIds,
    count: totalQuestions,
  });

  const suffix = new mongoose.Types.ObjectId().toString().slice(-6);
  const exam = await Exam.create({
    title: `Weak area practice ${suffix}`,
    description: 'Auto-generated weak-area exam',
    examType: 'weak-area',
    topicIds: topicIds.map((id) => new mongoose.Types.ObjectId(id)),
    subtopicIds: [],
    difficulty: 'mixed',
    totalQuestions,
    durationMinutes: WEAK_AREA_DEFAULT_DURATION_MINUTES,
    passingScore: 50,
    visibilityStatus: 'hidden',
    isActive: true,
    createdBy: resolveCreatedBy(user),
  });

  return examSessionService.beginSessionWithMcqs(exam, userId, mcqs);
}
