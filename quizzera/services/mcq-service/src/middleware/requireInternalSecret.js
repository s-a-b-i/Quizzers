import crypto from 'crypto';

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * Internal routes (e.g. exam-service). Header `x-internal-secret` must match `INTERNAL_SECRET`.
 */
export function requireInternalSecret(req, res, next) {
  const expected = process.env.INTERNAL_SECRET;
  if (typeof expected !== 'string' || expected.length === 0) {
    return res.status(503).json({
      success: false,
      message: 'Internal routes are not configured (INTERNAL_SECRET).',
    });
  }

  const provided = req.headers['x-internal-secret'];
  const providedStr = Array.isArray(provided) ? provided[0] : provided;
  if (!timingSafeEqualString(String(providedStr ?? ''), expected)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
    });
  }

  next();
}
