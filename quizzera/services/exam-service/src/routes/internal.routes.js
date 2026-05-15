import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { getInternalReadiness } from '../controllers/internal.controller.js';
import { requireInternalSecret } from '../middleware/requireInternalSecret.js';

const router = Router();

router.get('/readiness', requireInternalSecret, asyncHandler(getInternalReadiness));

export default router;
