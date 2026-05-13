import * as mcqService from '../services/mcq.service.js';

export async function fetchMcqsForExam(req, res, next) {
  try {
    const { mcqs } = await mcqService.fetchMcqsForExam(req.fetchForExamPayload);
    res.json({ success: true, data: { mcqs } });
  } catch (err) {
    next(err);
  }
}

export async function softDeleteMcq(req, res, next) {
  try {
    const result = await mcqService.softDeleteMcq(req.params.id);
    if (result.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found.',
      });
    }
    res.json({
      success: true,
      data: { message: 'MCQ deactivated.' },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMcq(req, res, next) {
  try {
    const result = await mcqService.updateMcq(req.params.id, req.body, req.user);
    if (result.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found.',
      });
    }
    if (result.code === 'VALIDATION') {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
    res.json({ success: true, data: { mcq: result.mcq } });
  } catch (err) {
    next(err);
  }
}

export async function listBookmarks(req, res, next) {
  try {
    const result = await mcqService.listBookmarksForUser(req.user, req.bookmarksQuery);
    if (!result.ok) {
      if (result.code === 'NO_USER') {
        return res.status(403).json({
          success: false,
          message: 'Unable to resolve user for bookmarks.',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Bookmarks list failed.',
      });
    }
    const { mcqs, total, page, limit } = result;
    res.json({ success: true, data: { mcqs, total, page, limit } });
  } catch (err) {
    next(err);
  }
}

export async function toggleBookmark(req, res, next) {
  try {
    const result = await mcqService.toggleBookmark(req.params.id, req.user);
    if (!result.ok) {
      if (result.code === 'NO_USER') {
        return res.status(403).json({
          success: false,
          message: 'Unable to resolve user for bookmarks.',
        });
      }
      if (result.code === 'INVALID_MCQ_ID' || result.code === 'MCQ_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'MCQ not found.',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Bookmark toggle failed.',
      });
    }
    res.json({ success: true, data: { bookmarked: result.bookmarked } });
  } catch (err) {
    next(err);
  }
}

export async function getMcqAnswer(req, res, next) {
  try {
    const payload = await mcqService.revealMcqAnswer(req.params.id, req.user);
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found.',
      });
    }
    res.json({
      success: true,
      data: {
        correctAnswer: payload.correctAnswer,
        explanation: payload.explanation,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMcqById(req, res, next) {
  try {
    const mcq = await mcqService.getMcqById(req.params.id, {
      privileged: req.mcqListPrivileged === true,
    });
    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found.',
      });
    }
    res.json({ success: true, data: { mcq } });
  } catch (err) {
    next(err);
  }
}

export async function listMcqs(req, res, next) {
  try {
    const { mcqs, total, page, limit } = await mcqService.listMcqs({
      privileged: req.mcqListPrivileged === true,
      filters: req.mcqListQuery,
    });
    res.json({ success: true, data: { mcqs, total, page, limit } });
  } catch (err) {
    next(err);
  }
}

export async function createMcq(req, res, next) {
  try {
    const mcq = await mcqService.createMcq(req.body, req.user);
    res.status(201).json({ success: true, data: { mcq } });
  } catch (err) {
    next(err);
  }
}

export async function bulkCreateMcqs(req, res, next) {
  try {
    const { inserted, errors } = await mcqService.bulkCreateMcqs(req.body, req.user);
    res.json({ success: true, data: { inserted, errors } });
  } catch (err) {
    next(err);
  }
}

export function mcqHealth(_req, res) {
  res.json({
    success: true,
    data: { status: 'ok', scope: 'mcqs' },
  });
}
