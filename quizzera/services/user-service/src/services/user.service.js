import mongoose from 'mongoose';
import User from '../models/User.js';

function normalizeEmail(email) {
  if (typeof email !== 'string' || !email.trim()) return null;
  return email.trim().toLowerCase();
}

/** Find-or-create minimal profile for the signed-in Firebase user (user-service DB). */
export async function ensureProfile({ firebaseUid, email }) {
  let user = await User.findOne({ firebaseUid });
  if (user) return user;

  const normalized = normalizeEmail(email);
  if (!normalized) {
    const err = new Error('Authenticated user has no email claim; cannot create profile.');
    err.statusCode = 422;
    throw err;
  }

  try {
    user = await User.create({
      firebaseUid,
      email: normalized,
    });
    return user;
  } catch (createErr) {
    if (createErr?.code === 11000) {
      user = await User.findOne({ $or: [{ firebaseUid }, { email: normalized }] });
      if (user) return user;
    }
    throw createErr;
  }
}

/** Shallow-merge `preferences` onto the existing document and persist. */
export async function patchOnboardingCompleted(user, onboardingCompleted) {
  user.onboardingCompleted = onboardingCompleted;
  await user.save();
  return user;
}

export async function findAllUsers() {
  return User.find().sort({ createdAt: -1 }).lean();
}

export async function findUserById(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }
  return User.findById(userId);
}

export async function patchPreferences(user, preferencesUpdate) {
  const prev =
    user.preferences && typeof user.preferences === 'object'
      ? { ...(user.preferences.toObject?.() ?? user.preferences) }
      : {};
  user.preferences = { ...prev, ...preferencesUpdate };
  user.markModified('preferences');
  await user.save();
  return user;
}

/**
 * Admin-only: patch role/accountStatus on another user and append audit entry to activitySummary.
 * @param {{ firebaseUid: string, email: string }} actor — authenticated admin from verifyToken
 */
export async function patchUserByAdmin(actor, targetUserId, updates) {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error('Invalid user id.');
    err.statusCode = 400;
    throw err;
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const changes = {};

  if ('role' in updates) {
    changes.role = { from: target.role, to: updates.role };
    target.role = updates.role;
  }

  if ('accountStatus' in updates) {
    changes.accountStatus = { from: target.accountStatus, to: updates.accountStatus };
    target.accountStatus = updates.accountStatus;
  }

  const summary =
    target.activitySummary && typeof target.activitySummary === 'object'
      ? { ...(target.activitySummary.toObject?.() ?? target.activitySummary) }
      : {};

  const auditLog = Array.isArray(summary.adminAuditLog) ? [...summary.adminAuditLog] : [];

  auditLog.push({
    at: new Date().toISOString(),
    actorFirebaseUid: actor.firebaseUid,
    actorEmail: actor.email,
    changes,
  });

  summary.adminAuditLog = auditLog;
  target.activitySummary = summary;
  target.markModified('activitySummary');

  await target.save();
  return target;
}
