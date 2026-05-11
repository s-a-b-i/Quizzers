import { Router } from 'express';
import {
  createSubject,
  deleteSubjectBySlug,
  getSubjectBySlug,
  listSubjects,
  patchSubjectBySlug,
} from '../controllers/subjects.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateCreateSubject } from '../middleware/validateCreateSubject.js';
import { validatePatchSubject } from '../middleware/validatePatchSubject.js';
import { requireAdminIfIncludeInactive } from '../middleware/requireAdminIfIncludeInactive.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.get('/', requireAdminIfIncludeInactive, listSubjects);

router.post(
  '/',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validateCreateSubject,
  createSubject
);

router.get('/:slug', getSubjectBySlug);

router.patch(
  '/:slug',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validatePatchSubject,
  patchSubjectBySlug
);

router.delete(
  '/:slug',
  verifyToken,
  requireRole(['superAdmin']),
  deleteSubjectBySlug
);

export default router;
