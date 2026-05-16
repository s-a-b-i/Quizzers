import mongoose from 'mongoose';
import ExamSession from '../models/ExamSession.js';

/**
 * Loads ExamSession by `req.params.sessionId`, ensures `session.userId` matches `req.user._id`.
 * Sets `req.session` on success. Run after `verifyToken`.
 */
export async function checkSessionOwner(req, res, next) {
  try {
    const raw = req.params.sessionId;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionId parameter.',
      });
    }

    const sessionId = String(raw).trim();
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sessionId.',
      });
    }

    const ownerId = req.user?._id;
    if (ownerId === undefined || ownerId === null) {
      return res.status(401).json({
        success: false,
        message: 'User identity required.',
      });
    }

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      });
    }

    if (String(session.userId) !== String(ownerId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden.',
      });
    }

    req.session = session;
    return next();
  } catch (err) {
    return next(err);
  }
}
