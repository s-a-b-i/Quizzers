import { requireRole } from './requireRole.js';
import { verifyToken } from './verifyToken.js';

function wantsIncludeInactive(req) {
  return ['1', 'true', 'yes'].includes(String(req.query?.includeInactive ?? '').toLowerCase());
}

/**
 * When `?includeInactive=1|true|yes`, require admin/superAdmin and set req.taxonomyListIncludeInactive.
 * Otherwise public list (active only) unchanged.
 */
export function requireAdminIfIncludeInactive(req, res, next) {
  if (!wantsIncludeInactive(req)) {
    return next();
  }
  verifyToken(req, res, () => {
    requireRole(['admin', 'superAdmin'])(req, res, () => {
      req.taxonomyListIncludeInactive = true;
      next();
    });
  });
}
