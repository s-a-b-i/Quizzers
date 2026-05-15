export default function errorHandler(err, _req, res, _next) {
  if (typeof err?.statusCode === 'number' && err.message) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
    });
  }

  if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
}
