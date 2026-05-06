import { Router } from 'express';
import {
  bootstrapProfile,
  getMe,
  getUserById,
  listUsers,
  patchMe,
  patchMeOnboarding,
  patchUserById,
} from '../controllers/users.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireSelfOrAdmin } from '../middleware/requireSelfOrAdmin.js';
import { validateAdminUserPatch } from '../middleware/validateAdminUserPatch.js';
import { validateOnboardingPatch } from '../middleware/validateOnboardingPatch.js';
import { validatePreferencesPatch } from '../middleware/validatePreferencesPatch.js';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.post('/bootstrap', verifyFirebaseToken, bootstrapProfile);

router.get('/me', verifyToken, getMe);
router.patch('/me', verifyToken, validatePreferencesPatch, patchMe);
router.patch('/me/onboarding', verifyToken, validateOnboardingPatch, patchMeOnboarding);

router.get('/', verifyToken, requireRole(['admin', 'superAdmin']), listUsers);

router.get('/:userId', verifyToken, requireSelfOrAdmin('userId'), getUserById);

router.patch(
  '/:userId',
  verifyToken,
  requireRole(['admin', 'superAdmin']),
  validateAdminUserPatch,
  patchUserById
);

export default router;
