import mongoose from 'mongoose';
import Exam from '../models/Exam.js';
import * as taxonomyClient from './taxonomyClient.service.js';
import * as examSessionService from './examSession.service.js';

function resolveCreatedBy(user) {
  const id = user?._id;
  if (id === undefined || id === null) return undefined;
  const s = String(id).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return undefined;
  return new mongoose.Types.ObjectId(s);
}

async function resolveSubtopicIds(subjectId, topicIds) {
  const topics = await taxonomyClient.listTopicsForSubject(subjectId);
  const allowedTopicIds = new Set(topics.map((t) => String(t._id)));

  for (let i = 0; i < topicIds.length; i += 1) {
    if (!allowedTopicIds.has(topicIds[i])) {
      const err = new Error(`topicIds[${i}] does not belong to the given subject.`);
      err.statusCode = 400;
      throw err;
    }
  }

  const subtopicIdSet = new Set();
  for (const topicId of topicIds) {
    const subtopics = await taxonomyClient.listSubtopicsForTopic(topicId);
    for (const sub of subtopics) {
      if (sub?._id != null) subtopicIdSet.add(String(sub._id));
    }
  }

  if (subtopicIdSet.size === 0) {
    const err = new Error('No subtopics found for the selected topics.');
    err.statusCode = 400;
    throw err;
  }

  return Array.from(subtopicIdSet);
}

/**
 * Create a temporary dynamic exam and start a session immediately.
 */
export async function generateDynamicExam(payload, user, authorization) {
  const subtopicIds = await resolveSubtopicIds(payload.subjectId, payload.topicIds);

  const suffix = new mongoose.Types.ObjectId().toString().slice(-6);
  const exam = await Exam.create({
    title: `Dynamic practice ${suffix}`,
    description: 'Auto-generated dynamic exam',
    examType: 'dynamic',
    subjectIds: [new mongoose.Types.ObjectId(payload.subjectId)],
    topicIds: payload.topicIds.map((id) => new mongoose.Types.ObjectId(id)),
    subtopicIds: subtopicIds.map((id) => new mongoose.Types.ObjectId(id)),
    difficulty: payload.difficulty,
    totalQuestions: payload.totalQuestions,
    durationMinutes: payload.durationMinutes,
    passingScore: 50,
    visibilityStatus: 'hidden',
    isActive: true,
    createdBy: resolveCreatedBy(user),
  });

  return examSessionService.beginSessionForExam(exam, user, authorization);
}
