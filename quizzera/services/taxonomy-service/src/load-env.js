import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnvFile(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Always load taxonomy-service/.env (not cwd), so `npm run dev` from repo root still picks up MONGO_URI. */
const taxonomyEnvPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: taxonomyEnvPath, override: true });

const firebaseKeys = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const needsFirebaseFallback = firebaseKeys.some((k) => !String(process.env[k] ?? '').trim());

if (needsFirebaseFallback) {
  const authEnvPath = path.join(__dirname, '..', '..', 'auth-service', '.env');
  try {
    const parsed = parseEnvFile(fs.readFileSync(authEnvPath, 'utf8'));
    for (const key of firebaseKeys) {
      if (!String(process.env[key] ?? '').trim() && parsed[key]) {
        process.env[key] = parsed[key];
      }
    }
  } catch {
    // firebase.js reports missing vars if auth .env is absent too
  }
}
