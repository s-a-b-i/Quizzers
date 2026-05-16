import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { checkEntitlement } from '../middleware/checkEntitlement.js';
import { requireRole } from '../middleware/requireRole.js';
import { optionalListPrivilege } from '../middleware/optionalListPrivilege.js';
import { validateListExamQuery } from '../middleware/validateListExamQuery.js';
import { validateCreateExam } from '../middleware/validateCreateExam.js';
import {
  createExam,
  getExamById,
  getExamBySlug,
  listExams,
  softDeleteExam,
  updateExam,
} from '../controllers/exam.controller.js';
import {
  generateDynamicExam,
  generateWeakAreaExam,
  getMyExamHistory,
  getSession,
  getSessionResult,
  listAdminSessions,
  saveProgress,
  startExam,
  submitExam,
} from '../controllers/examSession.controller.js';
import { validateGenerateDynamicExam } from '../middleware/validateGenerateDynamicExam.js';
import { checkSessionOwner } from '../middleware/checkSessionOwner.js';
import { validateSaveProgress } from '../middleware/validateSaveProgress.js';
import { validateExamHistoryQuery } from '../middleware/validateExamHistoryQuery.js';
import { validateUpdateExam } from '../middleware/validateUpdateExam.js';
import { validateAdminSessionsQuery } from '../middleware/validateAdminSessionsQuery.js';

const ADMIN_ROLES = ['admin', 'superAdmin'];

const router = Router();

router.get('/', optionalListPrivilege, validateListExamQuery, asyncHandler(listExams));

router.get(
  '/my/history',
  verifyToken,
  validateExamHistoryQuery,
  asyncHandler(getMyExamHistory)
);

router.get(
  '/admin/sessions',
  verifyToken,
  requireRole(ADMIN_ROLES),
  validateAdminSessionsQuery,
  asyncHandler(listAdminSessions)
);

router.post(
  '/dynamic/generate',
  verifyToken,
  checkEntitlement,
  validateGenerateDynamicExam,
  asyncHandler(generateDynamicExam)
);

router.post(
  '/weak-area/generate',
  verifyToken,
  checkEntitlement,
  asyncHandler(generateWeakAreaExam)
);

router.get(
  '/sessions/:sessionId',
  verifyToken,
  checkSessionOwner,
  asyncHandler(getSession)
);

router.patch(
  '/sessions/:sessionId/progress',
  verifyToken,
  checkSessionOwner,
  validateSaveProgress,
  asyncHandler(saveProgress)
);

router.post(
  '/sessions/:sessionId/submit',
  verifyToken,
  checkSessionOwner,
  asyncHandler(submitExam)
);

router.get(
  '/sessions/:sessionId/result',
  verifyToken,
  checkSessionOwner,
  asyncHandler(getSessionResult)
);

router.patch(
  '/:examId([a-fA-F0-9]{24})',
  verifyToken,
  requireRole(ADMIN_ROLES),
  validateUpdateExam,
  asyncHandler(updateExam)
);

router.delete(
  '/:examId([a-fA-F0-9]{24})',
  verifyToken,
  requireRole(ADMIN_ROLES),
  asyncHandler(softDeleteExam)
);

router.get(
  '/by-id/:examId([a-fA-F0-9]{24})',
  optionalListPrivilege,
  asyncHandler(getExamById)
);

router.get('/:slug', optionalListPrivilege, asyncHandler(getExamBySlug));

router.post(
  '/:examId/start',
  verifyToken,
  checkEntitlement,
  asyncHandler(startExam)
);

router.post(
  '/',
  verifyToken,
  requireRole(['admin', 'contentManager']),
  validateCreateExam,
  asyncHandler(createExam)
);

export default router;
