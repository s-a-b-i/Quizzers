import { Router } from 'express';
import {
  createExamBody,
  deleteExamBodyBySlug,
  getExamBodyBySlug,
  listExamBodies,
  patchExamBodyBySlug,
} from '../controllers/examBodies.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateCreateExamBody } from '../middleware/validateCreateExamBody.js';
import { validatePatchExamBody } from '../middleware/validatePatchExamBody.js';
import { requireAdminIfIncludeInactive } from '../middleware/requireAdminIfIncludeInactive.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.get('/', requireAdminIfIncludeInactive, listExamBodies);

router.post(
  '/',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validateCreateExamBody,
  createExamBody
);

router.get('/:slug', getExamBodyBySlug);

router.patch(
  '/:slug',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validatePatchExamBody,
  patchExamBodyBySlug
);

router.delete(
  '/:slug',
  verifyToken,
  requireRole(['superAdmin']),
  deleteExamBodyBySlug
);

export default router;
