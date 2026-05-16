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

/** GET /exams/my/history */
export function validateExamHistoryQuery(req, res, next) {
  req.examHistoryQuery = {
    page: parsePositiveInt(req.query.page, 1, 1_000_000),
    limit: parsePositiveInt(req.query.limit, 20, 100),
  };
  next();
}
