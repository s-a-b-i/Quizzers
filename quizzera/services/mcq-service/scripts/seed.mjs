/**
 * Seed 30 sample MCQs (approved + public) using taxonomy IDs from JSON.
 *
 * Prerequisite: run taxonomy seed first so it writes placements:
 *   cd services/taxonomy-service && node scripts/seed.mjs
 * That produces `taxonomy-service/scripts/taxonomy-ids-for-mcq.json`.
 *
 * Run from mcq-service root:
 *   node scripts/seed.mjs
 *
 * Optional: TAXONOMY_IDS_JSON=/absolute/or/relative/path/to.json
 */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import MCQ from '../src/models/MCQ.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const SEED_SOURCE = 'mcq-service-seed';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function taxonomyJsonCandidates() {
  const c = [];
  if (process.env.TAXONOMY_IDS_JSON) {
    const raw = process.env.TAXONOMY_IDS_JSON.trim();
    if (raw) {
      c.push(path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw));
    }
  }
  c.push(path.join(__dirname, 'taxonomy-ids-for-mcq.json'));
  c.push(path.join(__dirname, '..', '..', 'taxonomy-service', 'scripts', 'taxonomy-ids-for-mcq.json'));
  return [...new Set(c)];
}

async function readTaxonomyPlacements() {
  const candidates = taxonomyJsonCandidates();
  let lastErr;
  for (const p of candidates) {
    try {
      const raw = await readFile(p, 'utf8');
      const data = JSON.parse(raw);
      const placements = data?.placements;
      if (!Array.isArray(placements) || placements.length === 0) {
        throw new Error('JSON must contain a non-empty "placements" array.');
      }
      for (const row of placements) {
        for (const key of ['subjectId', 'topicId', 'subtopicId', 'examBodyId', 'examTypeId']) {
          if (!row[key] || !mongoose.Types.ObjectId.isValid(String(row[key]))) {
            throw new Error(`Invalid or missing "${key}" in placement.`);
          }
        }
      }
      return { placements, pathUsed: p };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Could not read taxonomy IDs JSON. Tried:\n${candidates.join('\n')}\nLast error: ${lastErr?.message ?? lastErr}\nRun taxonomy seed first: cd services/taxonomy-service && node scripts/seed.mjs`
  );
}

function buildQuestionStem(i, placement) {
  const short = placement.subtopicName ?? `Subtopic ${i + 1}`;
  return `[Seed #${i + 1}] Sample MCQ for “${short}”: which option is correct?`;
}

function buildOptions(correctLabel) {
  const labels = ['A', 'B', 'C', 'D'];
  return labels.map((label) => ({
    label,
    text:
      label === correctLabel
        ? 'Correct answer (seed).'
        : `Distractor ${label} — not the best choice.`,
  }));
}

async function main() {
  await connectDatabase();

  const { placements, pathUsed } = await readTaxonomyPlacements();
  console.log(`Using taxonomy placements from: ${pathUsed}`);

  if (placements.length < 30) {
    throw new Error(
      `Need at least 30 taxonomy placements; found ${placements.length}. Expand taxonomy seed data.`
    );
  }

  const picked = shuffle(placements).slice(0, 30);

  const deleted = await MCQ.deleteMany({ source: SEED_SOURCE });
  console.log(`Removed ${deleted.deletedCount} prior seed MCQs (source="${SEED_SOURCE}").`);

  const docs = [];
  for (let i = 0; i < 30; i += 1) {
    const placement = picked[i];
    const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
    const correctLabel = ['A', 'B', 'C', 'D'][i % 4];

    docs.push({
      questionStem: buildQuestionStem(i, placement),
      options: buildOptions(correctLabel),
      correctAnswer: correctLabel,
      explanation: `Seed explanation for question ${i + 1}. Correct label is ${correctLabel}.`,
      subjectId: placement.subjectId,
      topicId: placement.topicId,
      subtopicId: placement.subtopicId,
      examMappings: [
        {
          examBodyId: placement.examBodyId,
          examTypeId: placement.examTypeId,
        },
      ],
      difficulty,
      source: SEED_SOURCE,
      tags: ['seed', 'taxonomy'],
      reviewStatus: 'approved',
      visibilityStatus: 'public',
      isActive: true,
    });
  }

  await MCQ.insertMany(docs);
  console.log('Inserted 30 seed MCQs (reviewStatus=approved, visibilityStatus=public).');
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
