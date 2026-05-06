/**
 * Prerequisite: user-service on :3002 and gateway on :3000 already running with valid env.
 * Anonymous Firebase sign-up → upsert profile in quizzera_users → GET /api/users/me via gateway.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
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
    env[key] = val;
  }
  return env;
}

async function anonymousSignUp(apiKey) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.idToken || !json.localId) {
    throw new Error(`Firebase signUp failed: ${JSON.stringify(json)}`);
  }
  return { idToken: json.idToken, localId: json.localId };
}

async function main() {
  const authEnvPath = path.join(root, 'services/auth-service/.env');
  const authEnv = loadEnvFile(authEnvPath);
  const apiKey = authEnv.FIREBASE_WEB_API_KEY;
  const mongoUsersUri = authEnv.MONGO_URI.replace(/\/quizzera_auth(\?|$)/, '/quizzera_users$1');

  const { idToken, localId } = await anonymousSignUp(apiKey);
  const email = `gw.itest.${localId.slice(0, 12)}@test.quizzera`;

  const userServiceRoot = path.join(root, 'services/user-service');
  const mongooseHref = pathToFileURL(path.join(userServiceRoot, 'node_modules/mongoose/index.js')).href;
  const mongoose = (await import(mongooseHref)).default;

  await mongoose.connect(mongoUsersUri);
  const col = mongoose.connection.collection('users');
  await col.updateOne(
    { firebaseUid: localId },
    {
      $setOnInsert: {
        firebaseUid: localId,
        email,
        role: 'student',
        accountStatus: 'active',
        onboardingCompleted: false,
        preferences: {},
        activitySummary: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  await mongoose.disconnect();

  const meRes = await fetch('http://localhost:3000/api/users/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const meBody = await meRes.json().catch(() => ({}));

  console.log('GET /api/users/me status:', meRes.status);
  console.log('success:', meBody.success);
  console.log('firebaseUid match:', meBody?.data?.user?.firebaseUid === localId);

  if (meRes.status !== 200 || !meBody.success || meBody?.data?.user?.firebaseUid !== localId) {
    console.error('FAIL', JSON.stringify(meBody).slice(0, 400));
    process.exit(1);
  }
  console.log('PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
