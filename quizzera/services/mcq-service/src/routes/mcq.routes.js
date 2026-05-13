import { Router } from 'express';
import {
  bulkCreateMcqs,
  createMcq,
  fetchMcqsForExam,
  getMcqAnswer,
  getMcqById,
  listBookmarks,
  listMcqs,
  mcqHealth,
  softDeleteMcq,
  toggleBookmark,
  updateMcq,
} from '../controllers/mcq.controller.js';
import { requireInternalSecret } from '../middleware/requireInternalSecret.js';
import { validateFetchMcqsForExam } from '../middleware/validateFetchMcqsForExam.js';
import { checkEntitlement } from '../middleware/checkEntitlement.js';
import { optionalListPrivilege } from '../middleware/optionalListPrivilege.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBookmarksQuery } from '../middleware/validateBookmarksQuery.js';
import { validateBulkMcqs } from '../middleware/validateBulkMcqs.js';
import { validateCreateMcq } from '../middleware/validateCreateMcq.js';
import { validateListMcqQuery } from '../middleware/validateListMcqQuery.js';
import { validateUpdateMcq } from '../middleware/validateUpdateMcq.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.get('/health', mcqHealth);
router.post(
  '/internal/fetch-for-exam',
  requireInternalSecret,
  validateFetchMcqsForExam,
  fetchMcqsForExam
);
router.get('/bookmarks', verifyToken, checkEntitlement, validateBookmarksQuery, listBookmarks);
router.get('/', optionalListPrivilege, validateListMcqQuery, listMcqs);
router.post('/:id/bookmark', verifyToken, checkEntitlement, toggleBookmark);
router.get('/:id/answer', verifyToken, checkEntitlement, getMcqAnswer);
router.get('/:id', optionalListPrivilege, getMcqById);

const adminContentRoles = ['admin', 'superAdmin', 'contentManager'];
const patchMcqRoles = ['admin', 'contentManager'];
const deleteMcqRoles = ['admin', 'superAdmin'];

router.post('/bulk', verifyToken, requireRole(adminContentRoles), validateBulkMcqs, bulkCreateMcqs);

router.post('/', verifyToken, requireRole(adminContentRoles), validateCreateMcq, createMcq);

router.patch(
  '/:id([a-fA-F0-9]{24})',
  verifyToken,
  requireRole(patchMcqRoles),
  validateUpdateMcq,
  updateMcq
);

router.delete(
  '/:id([a-fA-F0-9]{24})',
  verifyToken,
  requireRole(deleteMcqRoles),
  softDeleteMcq
);

export default router;
