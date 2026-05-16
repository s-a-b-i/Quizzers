import mongoose from 'mongoose';
import { SESSION_STATUSES } from '../models/ExamSession.js';

function firstQuery(val) {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return val[0];
  return val;
}

function parsePositiveInt(raw, fallback, max) {
  const v = firstQuery(raw);
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function optionalObjectIdQuery(req, res, paramName) {
  const raw = firstQuery(req.query[paramName]);
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: true, value: undefined };
  }
  const id = String(raw).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      ok: false,
      response: res.status(400).json({
        success: false,
        message: `Query "${paramName}" must be a valid ObjectId.`,
      }),
    };
  }
  return { ok: true, value: id };
}

/** GET /exams/admin/sessions */
export function validateAdminSessionsQuery(req, res, next) {
  const userId = optionalObjectIdQuery(req, res, 'userId');
  if (!userId.ok) return;
  const examId = optionalObjectIdQuery(req, res, 'examId');
  if (!examId.ok) return;

  const statusRaw = firstQuery(req.query.status);
  let status;
  if (statusRaw !== undefined && statusRaw !== null && String(statusRaw).trim() !== '') {
    status = String(statusRaw).trim();
    if (!SESSION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Query "status" must be one of: ${SESSION_STATUSES.join(', ')}.`,
      });
    }
  }

  req.adminSessionsQuery = {
    userId: userId.value,
    examId: examId.value,
    status,
    page: parsePositiveInt(req.query.page, 1, 1_000_000),
    limit: parsePositiveInt(req.query.limit, 20, 100),
  };

  next();
}
