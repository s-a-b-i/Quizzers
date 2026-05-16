import * as dynamicExamService from '../services/dynamicExam.service.js';
import * as weakAreaExamService from '../services/weakAreaExam.service.js';
import * as examSessionService from '../services/examSession.service.js';

export async function startExam(req, res, next) {
  try {
    const result = await examSessionService.startExamSession({
      examId: req.params.examId,
      user: req.user,
      authorization: req.headers.authorization,
    });
    const { created, ...data } = result;
    res.status(created ? 201 : 200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSession(req, res, next) {
  try {
    const data = await examSessionService.getSessionState(
      req.session,
      req.headers.authorization
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function saveProgress(req, res, next) {
  try {
    await examSessionService.saveSessionProgress(req.session, req.saveProgressPayload);
    res.json({
      success: true,
      data: { message: 'Progress saved.' },
    });
  } catch (err) {
    next(err);
  }
}

export async function submitExam(req, res, next) {
  try {
    const result = await examSessionService.submitExamSession(req.session);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getSessionResult(req, res, next) {
  try {
    const data = await examSessionService.getSessionResult(req.session);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function generateWeakAreaExam(req, res, next) {
  try {
    const result = await weakAreaExamService.generateWeakAreaExam(
      req.user,
      req.headers.authorization
    );
    const { created, ...data } = result;
    res.status(created ? 201 : 200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function generateDynamicExam(req, res, next) {
  try {
    const result = await dynamicExamService.generateDynamicExam(
      req.generateDynamicExamPayload,
      req.user,
      req.headers.authorization
    );
    const { created, ...data } = result;
    res.status(created ? 201 : 200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listAdminSessions(req, res, next) {
  try {
    const data = await examSessionService.listAdminExamSessions(req.adminSessionsQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMyExamHistory(req, res, next) {
  try {
    const { page, limit } = req.examHistoryQuery;
    const data = await examSessionService.listMyExamHistory({
      user: req.user,
      page,
      limit,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
