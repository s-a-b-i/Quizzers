import { Router } from 'express';
import { getExamBodyTree } from '../controllers/tree.controller.js';

const router = Router();

router.get('/:examBodySlug', getExamBodyTree);

export default router;
