import * as subjectService from '../services/subject.service.js';

export async function createSubject(req, res, next) {
  try {
    const subject = await subjectService.createSubject(req.body);
    res.status(201).json({ success: true, data: { subject } });
  } catch (err) {
    next(err);
  }
}

export async function listSubjects(req, res, next) {
  try {
    const includeInactive = req.taxonomyListIncludeInactive === true;
    const { subjects, total } = includeInactive
      ? await subjectService.listAllSubjects({
          examBodyId: req.query?.examBodyId,
          examTypeId: req.query?.examTypeId,
        })
      : await subjectService.listActiveSubjects({
          examBodyId: req.query?.examBodyId,
          examTypeId: req.query?.examTypeId,
        });
    res.json({ success: true, data: { subjects, total } });
  } catch (err) {
    next(err);
  }
}

export async function getSubjectBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const subject = await subjectService.getSubjectBySlugWithRefs(slug);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }
    res.json({ success: true, data: { subject } });
  } catch (err) {
    next(err);
  }
}

export async function patchSubjectBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const subject = await subjectService.updateSubjectBySlug(slug, req.body);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }
    res.json({ success: true, data: { subject } });
  } catch (err) {
    next(err);
  }
}

export async function deleteSubjectBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const subject = await subjectService.softDeleteSubjectBySlug(slug);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }
    res.json({ success: true, data: { subject } });
  } catch (err) {
    next(err);
  }
}
