import * as examService from '../services/exam.service.js';

export async function listExams(req, res) {
  if (req.examListQuery.recommended) {
    const { exams, total, page, limit } = await examService.listRecommendedExams({
      authorization: req.headers.authorization,
      limit: req.examListQuery.limit ?? 3,
    });
    return res.json({
      success: true,
      data: { exams, total, page, limit },
    });
  }

  const { exams, total, page, limit } = await examService.listExams({
    privileged: req.examListPrivileged === true,
    filters: req.examListQuery,
  });
  res.json({
    success: true,
    data: { exams, total, page, limit },
  });
}

export async function getExamBySlug(req, res) {
  const exam = await examService.getExamBySlug(req.params.slug, {
    privileged: req.examListPrivileged === true,
  });
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found.',
    });
  }
  res.json({
    success: true,
    data: { exam },
  });
}

export async function getExamById(req, res) {
  const exam = await examService.getExamById(req.params.examId, {
    privileged: req.examListPrivileged === true,
  });
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found.',
    });
  }
  res.json({
    success: true,
    data: { exam },
  });
}

export async function createExam(req, res, next) {
  try {
    const exam = await examService.createExam(req.body, req.user);
    res.status(201).json({ success: true, data: { exam } });
  } catch (err) {
    next(err);
  }
}

export async function updateExam(req, res, next) {
  try {
    const result = await examService.updateExamById(req.params.examId, req.body);
    if (result.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Exam not found.',
      });
    }
    res.json({ success: true, data: { exam: result.exam } });
  } catch (err) {
    next(err);
  }
}

export async function softDeleteExam(req, res, next) {
  try {
    const result = await examService.softDeleteExamById(req.params.examId);
    if (result.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Exam not found.',
      });
    }
    res.json({
      success: true,
      data: { message: 'Exam deactivated.' },
    });
  } catch (err) {
    next(err);
  }
}
