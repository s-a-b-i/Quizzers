import { resolveUserFromBearerAuth } from './verifyToken.js';

const LIST_PRIVILEGED_ROLES = new Set(['admin', 'superAdmin', 'contentManager']);

function roleOf(user) {
  if (!user) return '';
  if (typeof user.role === 'string') return user.role.trim();
  return '';
}

/**
 * Public list route: no auth required. Sets `req.mcqListPrivileged` when Bearer token
 * belongs to admin / superAdmin / contentManager (same resolution as verifyToken).
 */
export async function optionalListPrivilege(req, res, next) {
  req.mcqListPrivileged = false;
  const user = await resolveUserFromBearerAuth(req.headers.authorization);
  const role = roleOf(user);
  if (user && LIST_PRIVILEGED_ROLES.has(role)) {
    req.mcqListPrivileged = true;
    req.user = user;
  }
  next();
}
