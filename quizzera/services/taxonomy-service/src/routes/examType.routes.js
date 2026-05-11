import { Router } from 'express';
import {
  createExamType,
  deleteExamTypeBySlug,
  getExamTypeBySlug,
  listExamTypes,
  patchExamTypeBySlug,
} from '../controllers/examTypes.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateCreateExamType } from '../middleware/validateCreateExamType.js';
import { validatePatchExamType } from '../middleware/validatePatchExamType.js';
import { requireAdminIfIncludeInactive } from '../middleware/requireAdminIfIncludeInactive.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.get('/', requireAdminIfIncludeInactive, listExamTypes);

router.post(
  '/',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validateCreateExamType,
  createExamType
);

router.get('/:slug', getExamTypeBySlug);

router.patch(
  '/:slug',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validatePatchExamType,
  patchExamTypeBySlug
);

router.delete(
  '/:slug',
  verifyToken,
  requireRole(['superAdmin']),
  deleteExamTypeBySlug
);

export default router;
