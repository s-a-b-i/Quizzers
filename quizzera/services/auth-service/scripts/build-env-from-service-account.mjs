/**
 * One-off: reads Firebase service account JSON, writes .env next to package.json.
 * Usage: node scripts/build-env-from-service-account.mjs <path-to-service-account.json>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceRoot = path.join(__dirname, '..');
const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error('Usage: node scripts/build-env-from-service-account.mjs <service-account.json>');
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const pemOneLine = j.private_key.replace(/\r?\n/g, '\\n');

const lines = [
  'PORT=3001',
  'MONGO_URI=mongodb://localhost:27017/quizzera_auth',
  `FIREBASE_PROJECT_ID=${j.project_id}`,
  `FIREBASE_CLIENT_EMAIL=${j.client_email}`,
  `FIREBASE_PRIVATE_KEY=${pemOneLine}`,
  'FIREBASE_WEB_API_KEY=',
  'JWT_SECRET=',
];

const outPath = path.join(serviceRoot, '.env');
fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log('Wrote', outPath);
