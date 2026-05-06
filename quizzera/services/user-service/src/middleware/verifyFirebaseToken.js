import auth from '../config/firebase.js';

/** Verifies Bearer Firebase ID token only (no Mongo lookup). */
export async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
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
    req.firebase = {
      firebaseUid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '',
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}
