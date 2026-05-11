import * as examBodyService from '../services/examBody.service.js';

export async function createExamBody(req, res, next) {
  try {
    const examBody = await examBodyService.createExamBody(req.body);
    res.status(201).json({ success: true, data: { examBody } });
  } catch (err) {
    next(err);
  }
}

export async function listExamBodies(req, res, next) {
  try {
    const search = req.query?.search;
    const includeInactive = req.taxonomyListIncludeInactive === true;
    const { examBodies, total } = includeInactive
      ? await examBodyService.listAllExamBodies({
          search: typeof search === 'string' ? search : '',
        })
      : await examBodyService.listActiveExamBodies({
          search: typeof search === 'string' ? search : '',
        });
    res.json({ success: true, data: { examBodies, total } });
  } catch (err) {
    next(err);
  }
}

export async function getExamBodyBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const examBody = await examBodyService.getExamBodyBySlugWithTypes(slug);
    if (!examBody) {
      return res.status(404).json({
        success: false,
        message: 'Exam body not found.',
      });
    }
    res.json({ success: true, data: { examBody } });
  } catch (err) {
    next(err);
  }
}

export async function patchExamBodyBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const examBody = await examBodyService.updateExamBodyBySlug(slug, req.body);
    if (!examBody) {
      return res.status(404).json({
        success: false,
        message: 'Exam body not found.',
      });
    }
    res.json({ success: true, data: { examBody } });
  } catch (err) {
    next(err);
  }
}

export async function deleteExamBodyBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const examBody = await examBodyService.softDeleteExamBodyBySlug(slug);
    if (!examBody) {
      return res.status(404).json({
        success: false,
        message: 'Exam body not found.',
      });
    }
    res.json({ success: true, data: { examBody } });
  } catch (err) {
    next(err);
  }
}
