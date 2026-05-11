import ExamBody from '../models/ExamBody.js';
import ExamType from '../models/ExamType.js';
import Subject from '../models/Subject.js';
import Subtopic from '../models/Subtopic.js';
import Topic from '../models/Topic.js';

function normalizeSlug(slug) {
  return String(slug ?? '').trim().toLowerCase();
}

/**
 * Full active taxonomy tree for an exam body (onboarding, MCQ filters, exam generation).
 * Shape: { name, examTypes: [{ name, subjects: [{ name, topics: [{ name, subtopics: [{ name }] }] }] }] }
 */
export async function getExamBodyTreeBySlug(examBodySlug) {
  const slug = normalizeSlug(examBodySlug);
  if (!slug) return null;

  const examTypesCol = ExamType.collection.name;
  const subjectsCol = Subject.collection.name;
  const topicsCol = Topic.collection.name;
  const subtopicsCol = Subtopic.collection.name;

  const pipeline = [
    { $match: { slug, isActive: true } },
    { $limit: 1 },
    {
      $lookup: {
        from: examTypesCol,
        let: { ebId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$examBodyId', '$$ebId'] }, { $eq: ['$isActive', true] }],
              },
            },
          },
          { $sort: { name: 1 } },
          {
            $lookup: {
              from: subjectsCol,
              let: { etId: '$_id', ebId2: '$examBodyId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$examTypeId', '$$etId'] },
                        { $eq: ['$examBodyId', '$$ebId2'] },
                        { $eq: ['$isActive', true] },
                      ],
                    },
                  },
                },
                { $sort: { name: 1 } },
                {
                  $lookup: {
                    from: topicsCol,
                    let: { sid: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$subjectId', '$$sid'] }, { $eq: ['$isActive', true] }],
                          },
                        },
                      },
                      { $sort: { name: 1 } },
                      {
                        $lookup: {
                          from: subtopicsCol,
                          let: { tid: '$_id' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$topicId', '$$tid'] }, { $eq: ['$isActive', true] }],
                                },
                              },
                            },
                            { $sort: { name: 1 } },
                            { $project: { _id: 0, name: 1 } },
                          ],
                          as: 'subtopics',
                        },
                      },
                      { $project: { _id: 0, name: 1, subtopics: 1 } },
                    ],
                    as: 'topics',
                  },
                },
                { $project: { _id: 0, name: 1, topics: 1 } },
              ],
              as: 'subjects',
            },
          },
          { $project: { _id: 0, name: 1, subjects: 1 } },
        ],
        as: 'examTypes',
      },
    },
    { $project: { _id: 0, name: 1, examTypes: 1 } },
  ];

  const rows = await ExamBody.aggregate(pipeline);
  if (!rows.length) return null;
  return rows[0];
}
