import * as topicService from '../services/topic.service.js';

export async function createTopic(req, res, next) {
  try {
    const topic = await topicService.createTopic(req.body);
    res.status(201).json({ success: true, data: { topic } });
  } catch (err) {
    next(err);
  }
}

export async function listTopics(req, res, next) {
  try {
    const includeInactive = req.taxonomyListIncludeInactive === true;
    const { topics, total } = await topicService.listTopics({
      subjectId: req.query?.subjectId,
      includeInactive,
    });
    res.json({ success: true, data: { topics, total } });
  } catch (err) {
    next(err);
  }
}

export async function getTopicBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const topic = await topicService.getTopicBySlugWithSubject(slug);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found.',
      });
    }
    res.json({ success: true, data: { topic } });
  } catch (err) {
    next(err);
  }
}

export async function patchTopicBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const topic = await topicService.updateTopicBySlug(slug, req.body);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found.',
      });
    }
    res.json({ success: true, data: { topic } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTopicBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const topic = await topicService.softDeleteTopicBySlug(slug);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found.',
      });
    }
    res.json({ success: true, data: { topic } });
  } catch (err) {
    next(err);
  }
}
