import { USER_ROLES } from '../models/User.js';

/** Roles at or above `student` (excludes `guest`). Placeholder until entitlement-service integration. */
const ENTITLED_ROLES = new Set(
  USER_ROLES.filter((r) => r !== 'guest')
);

/**
 * Requires an authenticated user with a paid-tier-eligible role (not `guest`).
 * Later: call entitlement-service and gate on plan / feature flags.
 */
export function checkEntitlement(req, res, next) {
  const role = req.user?.role;
  if (typeof role === 'string' && ENTITLED_ROLES.has(role)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Upgrade your plan.',
  });
}
