import * as examTypeService from '../services/examType.service.js';

export async function createExamType(req, res, next) {
  try {
    const examType = await examTypeService.createExamType(req.body);
    res.status(201).json({ success: true, data: { examType } });
  } catch (err) {
    next(err);
  }
}

export async function listExamTypes(req, res, next) {
  try {
    const examBodyId = req.query?.examBodyId;
    const includeInactive = req.taxonomyListIncludeInactive === true;
    const { examTypes, total } = includeInactive
      ? await examTypeService.listAllExamTypes({ examBodyId })
      : await examTypeService.listActiveExamTypes({ examBodyId });
    res.json({ success: true, data: { examTypes, total } });
  } catch (err) {
    next(err);
  }
}

export async function getExamTypeBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const examType = await examTypeService.getExamTypeBySlugWithBody(slug);
    if (!examType) {
      return res.status(404).json({
        success: false,
        message: 'Exam type not found.',
      });
    }
    res.json({ success: true, data: { examType } });
  } catch (err) {
    next(err);
  }
}

export async function patchExamTypeBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const examType = await examTypeService.updateExamTypeBySlug(slug, req.body);
    if (!examType) {
      return res.status(404).json({
        success: false,
        message: 'Exam type not found.',
      });
    }
    res.json({ success: true, data: { examType } });
  } catch (err) {
    next(err);
  }
}

export async function deleteExamTypeBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const examType = await examTypeService.softDeleteExamTypeBySlug(slug);
    if (!examType) {
      return res.status(404).json({
        success: false,
        message: 'Exam type not found.',
      });
    }
    res.json({ success: true, data: { examType } });
  } catch (err) {
    next(err);
  }
}
