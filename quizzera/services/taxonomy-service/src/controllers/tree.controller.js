import * as treeService from '../services/tree.service.js';

/** GET /taxonomy/tree/:examBodySlug — public */
export async function getExamBodyTree(req, res, next) {
  try {
    const { examBodySlug } = req.params;
    const examBody = await treeService.getExamBodyTreeBySlug(examBodySlug);
    if (!examBody) {
      return res.status(404).json({
        success: false,
        message: 'Exam body not found.',
      });
    }
    res.json({ success: true, data: { examBody } });
  } catch (err) {
    next(err);
  }
}
