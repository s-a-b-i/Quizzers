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

/** GET /mcqs/bookmarks — attach `req.bookmarksQuery` with `{ page, limit }`. */
export function validateBookmarksQuery(req, res, next) {
  const page = parsePositiveInt(req.query.page, 1, 1_000_000);
  const limit = parsePositiveInt(req.query.limit, 20, 100);
  req.bookmarksQuery = { page, limit };
  next();
}
