import auth from '../config/firebase.js';
import User, { USER_ROLES } from '../models/User.js';

/** Role + identity live in `quizzera_users`; mcq DB user mirror is optional. */
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

async function resolveUserAfterVerify(decoded, authHeader) {
  const user = await User.findOne({ firebaseUid: decoded.uid });
  if (user) return user;

  const fromUserService = await resolveUserFromUserService(authHeader);
  if (fromUserService?.firebaseUid === decoded.uid) {
    return fromUserService;
  }

  const roleClaim =
    typeof decoded.role === 'string' && decoded.role.trim() !== ''
      ? decoded.role.trim()
      : null;

  if (roleClaim) {
    if (!USER_ROLES.includes(roleClaim)) {
      return null;
    }
    const email =
      typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
    return {
      firebaseUid: decoded.uid,
      email,
      role: roleClaim,
    };
  }

  return null;
}

/**
 * Returns a user document, a plain user object from user-service, or a claim-shaped user.
 * Returns `null` if the token is invalid or no user could be resolved.
 */
export async function resolveUserFromBearerAuth(authHeader) {
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return null;
  }
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return await resolveUserAfterVerify(decoded, authHeader);
  } catch {
    return null;
  }
}

export async function verifyToken(req, res, next) {
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

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }

  try {
    const user = await resolveUserAfterVerify(decoded, authHeader);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}
