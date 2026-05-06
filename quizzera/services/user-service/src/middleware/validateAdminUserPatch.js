import { USER_ACCOUNT_STATUSES, USER_ROLES } from '../models/User.js';

const ROLE_SET = new Set(USER_ROLES);
const STATUS_SET = new Set(USER_ACCOUNT_STATUSES);

/** PATCH /users/:userId — only role + accountStatus, validated against model enums. */
export function validateAdminUserPatch(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const keys = Object.keys(req.body);
  const unknown = keys.filter((k) => k !== 'role' && k !== 'accountStatus');
  if (unknown.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unsupported field(s): ${unknown.join(', ')}.`,
    });
  }

  const updates = {};
  if ('role' in req.body) updates.role = req.body.role;
  if ('accountStatus' in req.body) updates.accountStatus = req.body.accountStatus;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Provide at least one of: role, accountStatus.',
    });
  }

  if ('role' in updates) {
    if (typeof updates.role !== 'string' || !ROLE_SET.has(updates.role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${USER_ROLES.join(', ')}.`,
      });
    }
  }

  if ('accountStatus' in updates) {
    if (typeof updates.accountStatus !== 'string' || !STATUS_SET.has(updates.accountStatus)) {
      return res.status(400).json({
        success: false,
        message: `accountStatus must be one of: ${USER_ACCOUNT_STATUSES.join(', ')}.`,
      });
    }
  }

  req.validatedAdminUserPatch = updates;
  next();
}
