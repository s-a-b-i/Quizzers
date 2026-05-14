import { Router } from 'express';
import {
  createSubtopic,
  deleteSubtopicBySlug,
  getSubtopicBySlug,
  listSubtopics,
  patchSubtopicBySlug,
} from '../controllers/subtopics.controller.js';
import { requireAdminIfIncludeInactive } from '../middleware/requireAdminIfIncludeInactive.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateCreateSubtopic } from '../middleware/validateCreateSubtopic.js';
import { validatePatchSubtopic } from '../middleware/validatePatchSubtopic.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.get('/', requireAdminIfIncludeInactive, listSubtopics);

router.post(
  '/',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validateCreateSubtopic,
  createSubtopic
);

router.get('/:slug', getSubtopicBySlug);

router.patch(
  '/:slug',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validatePatchSubtopic,
  patchSubtopicBySlug
);

router.delete(
  '/:slug',
  verifyToken,
  requireRole(['superAdmin']),
  deleteSubtopicBySlug
);

export default router;
