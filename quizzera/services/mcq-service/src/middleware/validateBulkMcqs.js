const MAX_BULK = 500;

/** POST /mcqs/bulk — body must be a JSON array (max MAX_BULK items). Per-item validation runs in the handler. */
export function validateBulkMcqs(req, res, next) {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON array of MCQ objects.',
    });
  }

  if (req.body.length > MAX_BULK) {
    return res.status(400).json({
      success: false,
      message: `A maximum of ${MAX_BULK} MCQs may be submitted per request.`,
    });
  }

  next();
}
