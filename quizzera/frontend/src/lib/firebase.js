import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

function readConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  };
}

let cachedApp;

export function getFirebaseApp() {
  if (cachedApp) {
    return cachedApp;
  }
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  const firebaseConfig = readConfig();
  const required = {
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `Firebase client configuration is missing or empty (${missing.join(
        ', '
      )}). Create quizzera/frontend/.env.local from .env.example, set the NEXT_PUBLIC_FIREBASE_* values from Firebase Console → Project settings → Your apps, then restart "npm run dev".`
    );
  }

  const config = { ...firebaseConfig };
  if (!config.storageBucket) {
    delete config.storageBucket;
  }

  cachedApp = initializeApp(config);
  return cachedApp;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
