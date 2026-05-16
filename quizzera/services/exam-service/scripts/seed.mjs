/**
 * Seed predefined public exams for local development.
 *
 * Prerequisite: run taxonomy seed (writes taxonomy-ids-for-mcq.json), then MCQ seed:
 *   cd services/taxonomy-service && node scripts/seed.mjs
 *   cd services/mcq-service && node scripts/seed.mjs
 *
 * Run from exam-service root:
 *   node scripts/seed.mjs
 *
 * Optional: TAXONOMY_IDS_JSON=/path/to/taxonomy-ids-for-mcq.json
 */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Exam from '../src/models/Exam.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SEED_TAG = 'seed';

function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function uniqueStrings(values) {
  return [...new Set(values.map((v) => String(v)))];
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
  c.push(path.join(__dirname, '..', '..', 'mcq-service', 'scripts', 'taxonomy-ids-for-mcq.json'));
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
        for (const key of [
          'subjectId',
          'topicId',
          'subtopicId',
          'examBodyId',
          'examTypeId',
        ]) {
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
    `Could not read taxonomy IDs JSON. Tried:\n${candidates.join('\n')}\nLast error: ${lastErr?.message ?? lastErr}\nRun taxonomy seed first.`
  );
}

function filterByExamType(placements, examBodyId, examTypeId) {
  return placements.filter(
    (p) => p.examBodyId === examBodyId && p.examTypeId === examTypeId
  );
}

function taxonomyRefs(rows) {
  return {
    examBodyId: toObjectId(rows[0].examBodyId),
    examTypeId: toObjectId(rows[0].examTypeId),
    subjectIds: uniqueStrings(rows.map((r) => r.subjectId)).map(toObjectId),
    topicIds: uniqueStrings(rows.map((r) => r.topicId)).map(toObjectId),
    subtopicIds: uniqueStrings(rows.map((r) => r.subtopicId)).map(toObjectId),
  };
}

function buildExamSpecs(placements) {
  const anchor = placements[0];
  const pool = filterByExamType(placements, anchor.examBodyId, anchor.examTypeId);
  if (pool.length < 4) {
    throw new Error('Need at least 4 taxonomy placements for the first exam type.');
  }

  const subjectOrder = uniqueStrings(pool.map((p) => p.subjectId));
  const subject1Rows = pool.filter((p) => p.subjectId === subjectOrder[0]);
  const subject2Rows = pool.filter((p) => p.subjectId === subjectOrder[1] ?? subjectOrder[0]);

  const firstTopicId = subject1Rows[0].topicId;
  const topicQuizRows = subject1Rows.filter((p) => p.topicId === firstTopicId);
  const topicLabel = topicQuizRows[0]?.topicName ?? 'Sample Topic';

  return [
    {
      title: 'PPSC Preliminary Mock Exam',
      description: 'Full-length mock exam across multiple topics (seed).',
      examType: 'mock',
      totalQuestions: 20,
      durationMinutes: 30,
      difficulty: 'mixed',
      rows: pool,
    },
    {
      title: `Topic Quiz — ${topicLabel}`,
      description: 'Focused quiz on a single topic (seed).',
      examType: 'topic-quiz',
      totalQuestions: 10,
      durationMinutes: 15,
      difficulty: 'medium',
      rows: topicQuizRows,
    },
    {
      title: `Timed Practice — ${subject2Rows[0]?.subjectName ?? 'Sample Subject'}`,
      description: 'Timed practice set for one subject area (seed).',
      examType: 'timed-practice',
      totalQuestions: 15,
      durationMinutes: 20,
      difficulty: 'mixed',
      rows: subject2Rows,
    },
  ];
}

async function main() {
  await connectDatabase();

  const { placements, pathUsed } = await readTaxonomyPlacements();
  console.log(`Using taxonomy placements from: ${pathUsed}`);

  const removed = await Exam.deleteMany({ tags: SEED_TAG });
  console.log(`Removed ${removed.deletedCount} prior seed exam(s).`);

  const specs = buildExamSpecs(placements);
  const created = [];

  for (const spec of specs) {
    const refs = taxonomyRefs(spec.rows);
    const doc = await Exam.create({
      title: spec.title,
      description: spec.description,
      examType: spec.examType,
      examBodyId: refs.examBodyId,
      examTypeId: refs.examTypeId,
      subjectIds: refs.subjectIds,
      topicIds: refs.topicIds,
      subtopicIds: refs.subtopicIds,
      difficulty: spec.difficulty,
      totalQuestions: spec.totalQuestions,
      durationMinutes: spec.durationMinutes,
      passingScore: 50,
      visibilityStatus: 'public',
      isActive: true,
      tags: [SEED_TAG, 'taxonomy'],
    });
    created.push({
      title: doc.title,
      slug: doc.slug,
      examType: doc.examType,
      totalQuestions: doc.totalQuestions,
      durationMinutes: doc.durationMinutes,
      subtopicCount: doc.subtopicIds.length,
    });
  }

  console.log('Exam seed complete. Created:');
  for (const row of created) {
    console.log(
      `  - ${row.title} (${row.examType}, ${row.totalQuestions}q / ${row.durationMinutes}m, slug=${row.slug}, subtopics=${row.subtopicCount})`
    );
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
