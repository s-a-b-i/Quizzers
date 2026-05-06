import auth from '../config/firebase.js';
import User from '../models/User.js';

export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header.',
      });
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header.',
      });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}
