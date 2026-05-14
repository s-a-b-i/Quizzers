import * as subtopicService from '../services/subtopic.service.js';

export async function listSubtopics(req, res, next) {
  try {
    const includeInactive = req.taxonomyListIncludeInactive === true;
    const { subtopics, total } = await subtopicService.listSubtopics({
      topicId: req.query?.topicId,
      includeInactive,
    });
    res.json({ success: true, data: { subtopics, total } });
  } catch (err) {
    next(err);
  }
}

export async function createSubtopic(req, res, next) {
  try {
    const subtopic = await subtopicService.createSubtopic(req.body);
    res.status(201).json({ success: true, data: { subtopic } });
  } catch (err) {
    next(err);
  }
}

export async function getSubtopicBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const subtopic = await subtopicService.getSubtopicBySlug(slug);
    if (!subtopic) {
      return res.status(404).json({
        success: false,
        message: 'Subtopic not found.',
      });
    }
    res.json({ success: true, data: { subtopic } });
  } catch (err) {
    next(err);
  }
}

export async function patchSubtopicBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const subtopic = await subtopicService.updateSubtopicBySlug(slug, req.body);
    if (!subtopic) {
      return res.status(404).json({
        success: false,
        message: 'Subtopic not found.',
      });
    }
    res.json({ success: true, data: { subtopic } });
  } catch (err) {
    next(err);
  }
}

export async function deleteSubtopicBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const subtopic = await subtopicService.softDeleteSubtopicBySlug(slug);
    if (!subtopic) {
      return res.status(404).json({
        success: false,
        message: 'Subtopic not found.',
      });
    }
    res.json({ success: true, data: { subtopic } });
  } catch (err) {
    next(err);
  }
}
