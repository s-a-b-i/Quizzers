import { pingMcqHealth } from '../services/mcqClient.service.js';

export async function getInternalReadiness(_req, res) {
  const mcq = await pingMcqHealth();
  res.json({
    success: true,
    data: {
      examService: 'ok',
      mcqService: mcq.ok ? 'reachable' : 'unreachable',
      mcqDetail: mcq.ok ? mcq.data : { error: mcq.error ?? 'unknown' },
    },
  });
}
