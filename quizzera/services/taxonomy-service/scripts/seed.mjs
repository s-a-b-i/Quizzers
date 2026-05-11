/**
 * Sample taxonomy data for local development.
 * Run from taxonomy-service root: node scripts/seed.mjs
 *
 * Clears all ExamBody, ExamType, Subject, Topic, and Subtopic documents, then seeds:
 * 2 exam bodies (PPSC, FPSC) → 2 exam types each → 3 subjects each type →
 * 2 topics per subject → 2 subtopics per topic.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import ExamBody from '../src/models/ExamBody.js';
import ExamType from '../src/models/ExamType.js';
import Subject from '../src/models/Subject.js';
import Topic from '../src/models/Topic.js';
import Subtopic from '../src/models/Subtopic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BODY_SPECS = [
  {
    name: 'PPSC',
    typeNames: [
      'PPSC Combined Competitive Preliminary',
      'PPSC Combined Competitive Mains',
    ],
  },
  {
    name: 'FPSC',
    typeNames: [
      'FPSC Central Superior Services Preliminary',
      'FPSC Central Superior Services Mains',
    ],
  },
];

async function main() {
  await connectDatabase();

  await Subtopic.deleteMany({});
  await Topic.deleteMany({});
  await Subject.deleteMany({});
  await ExamType.deleteMany({});
  await ExamBody.deleteMany({});

  let bodies = 0;
  let types = 0;
  let subjects = 0;
  let topics = 0;
  let subtopics = 0;

  for (const spec of BODY_SPECS) {
    const body = await ExamBody.create({
      name: spec.name,
      description: `Sample ${spec.name} exam body (seed).`,
      country: 'PK',
      tags: ['seed'],
    });
    bodies += 1;

    for (const typeName of spec.typeNames) {
      const examType = await ExamType.create({
        name: typeName,
        examBodyId: body._id,
        description: 'Sample exam type (seed).',
      });
      types += 1;

      for (let s = 1; s <= 3; s += 1) {
        const subjectName = `${typeName} — Sample Subject ${s}`;
        const subject = await Subject.create({
          name: subjectName,
          examBodyId: body._id,
          examTypeId: examType._id,
          description: 'Seed subject.',
          weightage: 10 + s,
          tags: ['seed'],
        });
        subjects += 1;

        for (let t = 1; t <= 2; t += 1) {
          const topic = await Topic.create({
            name: `${subjectName} — Topic ${t}`,
            subjectId: subject._id,
            description: '',
            weightage: 5,
            syllabusItem: '',
            tags: ['seed'],
          });
          topics += 1;

          for (let st = 1; st <= 2; st += 1) {
            await Subtopic.create({
              name: `${topic.name} — Subtopic ${st}`,
              topicId: topic._id,
              description: '',
              weightage: 1,
              syllabusItem: '',
              tags: ['seed'],
            });
            subtopics += 1;
          }
        }
      }
    }
  }

  console.log('Taxonomy seed complete.');
  console.log(
    `  examBodies=${bodies}, examTypes=${types}, subjects=${subjects}, topics=${topics}, subtopics=${subtopics}`
  );
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
