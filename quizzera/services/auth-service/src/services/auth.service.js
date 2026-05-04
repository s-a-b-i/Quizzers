import auth from '../config/firebase.js';
import User from '../models/User.js';

const SECURE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
const IDENTITY_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1';

function getFirebaseWebApiKey() {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    const err = new Error('Authentication is not configured on the server.');
    err.statusCode = 500;
    throw err;
  }
  return apiKey;
}

export async function loginWithEmailPassword({ email, password }) {
  const apiKey = getFirebaseWebApiKey();
  const url = `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || !json.localId || !json.idToken) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const firebaseUid = json.localId;

  let user = await User.findOne({ firebaseUid });
  if (!user) {
    user = await User.create({
      firebaseUid,
      email,
    });
  }

  return {
    user,
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    expiresIn: json.expiresIn,
  };
}

export async function createGuestSession() {
  const apiKey = getFirebaseWebApiKey();
  const url = `${IDENTITY_TOOLKIT_BASE}/accounts:signUp?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || !json.localId || !json.idToken) {
    const err = new Error('Could not create guest session.');
    err.statusCode = 502;
    throw err;
  }

  const firebaseUid = json.localId;
  const placeholderEmail = `guest.${firebaseUid}@guest.quizzera`;

  const user = await User.create({
    firebaseUid,
    email: placeholderEmail,
    role: 'guest',
  });

  return {
    user,
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    expiresIn: json.expiresIn,
  };
}

export async function refreshIdToken(refreshToken) {
  const apiKey = getFirebaseWebApiKey();
  const url = `${SECURE_TOKEN_URL}?key=${encodeURIComponent(apiKey)}`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || !json.id_token) {
    const err = new Error('Invalid or expired refresh token.');
    err.statusCode = 401;
    throw err;
  }

  return {
    idToken: json.id_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  };
}

export async function revokeUserRefreshTokens(firebaseUid) {
  await auth.revokeRefreshTokens(firebaseUid);
}

export async function signInWithGoogleIdToken(idToken) {
  const decoded = await auth.verifyIdToken(idToken);
  const firebaseUid = decoded.uid;
  const email = decoded.email;

  if (!email || typeof email !== 'string') {
    const err = new Error('Google sign-in token did not include an email.');
    err.statusCode = 422;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();

  let user = await User.findOne({ firebaseUid });
  if (!user) {
    user = await User.create({
      firebaseUid,
      email: normalizedEmail,
    });
  }

  return user;
}

export async function registerUser({ email, password }) {
  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      email,
      password,
    });

    const user = await User.create({
      firebaseUid: firebaseUser.uid,
      email,
    });

    return user;
  } catch (err) {
    if (firebaseUser) {
      try {
        await auth.deleteUser(firebaseUser.uid);
      } catch (rollbackErr) {
        console.error('Failed to rollback Firebase user after MongoDB error', rollbackErr);
      }
    }
    throw err;
  }
}
