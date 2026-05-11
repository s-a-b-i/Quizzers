import auth from '../config/firebase.js';
import User, { USER_ROLES } from '../models/User.js';

/** Role + identity live in `quizzera_users`; taxonomy DB user mirror is optional. */
async function resolveUserFromUserService(authHeader) {
  const base = String(process.env.USER_SERVICE_URL ?? 'http://localhost:3002').replace(/\/$/, '');
  const url = `${base}/users/me`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success || !json?.data?.user) {
      return null;
    }
    const u = json.data.user;
    const role = typeof u.role === 'string' ? u.role.trim() : '';
    if (!role || !USER_ROLES.includes(role)) {
      return null;
    }
    return {
      firebaseUid: String(u.firebaseUid ?? '').trim(),
      email: typeof u.email === 'string' ? u.email.trim().toLowerCase() : '',
      role,
    };
  } catch {
    return null;
  }
}

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

    if (user) {
      req.user = user;
      return next();
    }

    const fromUserService = await resolveUserFromUserService(authHeader);
    if (fromUserService?.firebaseUid === decoded.uid) {
      req.user = fromUserService;
      return next();
    }

    const roleClaim =
      typeof decoded.role === 'string' && decoded.role.trim() !== ''
        ? decoded.role.trim()
        : null;

    if (roleClaim) {
      if (!USER_ROLES.includes(roleClaim)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token.',
        });
      }
      const email =
        typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
      req.user = {
        firebaseUid: decoded.uid,
        email,
        role: roleClaim,
      };
      return next();
    }

    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}
