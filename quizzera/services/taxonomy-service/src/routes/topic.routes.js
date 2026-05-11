import { Router } from 'express';
import {
  createTopic,
  deleteTopicBySlug,
  getTopicBySlug,
  listTopics,
  patchTopicBySlug,
} from '../controllers/topics.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateCreateTopic } from '../middleware/validateCreateTopic.js';
import { validatePatchTopic } from '../middleware/validatePatchTopic.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.get('/', listTopics);

router.post(
  '/',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validateCreateTopic,
  createTopic
);

router.get('/:slug', getTopicBySlug);

router.patch(
  '/:slug',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validatePatchTopic,
  patchTopicBySlug
);

router.delete(
  '/:slug',
  verifyToken,
  requireRole(['superAdmin']),
  deleteTopicBySlug
);

export default router;
