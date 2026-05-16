import { resolveUserFromBearerAuth } from './verifyToken.js';

/** Roles that see all exams on GET /exams (including hidden/inactive). */
const LIST_PRIVILEGED_ROLES = new Set(['admin', 'superAdmin', 'contentManager']);

function roleOf(user) {
  if (!user) return '';
  if (typeof user.role === 'string') return user.role.trim();
  return '';
}

/**
 * Public list: optional Bearer. Sets `req.examListPrivileged` for admin-tier roles.
 */
export async function optionalListPrivilege(req, res, next) {
  req.examListPrivileged = false;
  const user = await resolveUserFromBearerAuth(req.headers.authorization);
  const role = roleOf(user);
  if (user) {
    req.user = user;
    if (LIST_PRIVILEGED_ROLES.has(role)) {
      req.examListPrivileged = true;
    }
  }
  next();
}
