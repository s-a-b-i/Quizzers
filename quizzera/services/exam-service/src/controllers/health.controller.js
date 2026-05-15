export function getHealth(_req, res) {
  res.json({
    success: true,
    data: { status: 'ok', service: 'exam-service' },
  });
}
