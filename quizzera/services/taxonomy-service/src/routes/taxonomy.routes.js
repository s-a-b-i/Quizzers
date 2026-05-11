import { Router } from 'express';
import examBodyRoutes from './examBody.routes.js';
import examTypeRoutes from './examType.routes.js';
import subjectRoutes from './subject.routes.js';
import topicRoutes from './topic.routes.js';
import treeRoutes from './tree.routes.js';

const router = Router();

/** Gateway: GET /api/taxonomy/health → GET /taxonomy/health */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', service: 'taxonomy-service' },
  });
});

router.use('/exam-bodies', examBodyRoutes);
router.use('/exam-types', examTypeRoutes);
router.use('/subjects', subjectRoutes);
router.use('/topics', topicRoutes);
router.use('/tree', treeRoutes);

export default router;
