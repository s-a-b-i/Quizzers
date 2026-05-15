import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { listExams } from '../controllers/exam.controller.js';

const router = Router();

router.get('/', asyncHandler(listExams));

export default router;
