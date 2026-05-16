import { USER_ROLES } from '../models/User.js';

const ENTITLED_ROLES = new Set(USER_ROLES.filter((r) => r !== 'guest'));

/**
 * Requires an authenticated user with a non-guest role.
 * Placeholder until entitlement-service integration.
 */
export function checkEntitlement(req, res, next) {
  const role = req.user?.role;
  if (typeof role !== 'string' || !ENTITLED_ROLES.has(role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Upgrade your plan.',
    });
  }
  next();
}
