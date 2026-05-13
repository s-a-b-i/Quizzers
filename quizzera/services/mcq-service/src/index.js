import './load-env.js';
import express from 'express';
import { connectDatabase } from './config/database.js';
import './models/User.js';
import './models/MCQ.js';
import mcqRoutes from './routes/mcq.routes.js';

const app = express();

app.use(express.json());

/** Direct hit on mcq-service (e.g. curl localhost:3004/health). */
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', service: 'mcq-service' },
  });
});

/** Gateway mounts /api/mcqs → pathRewrite → /mcqs/… */
app.use('/mcqs', mcqRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

app.use((err, _req, res, _next) => {
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
});

const PORT = process.env.PORT;
if (!PORT) {
  console.error('Missing PORT in environment. Set PORT in .env (see .env.example).');
  process.exit(1);
}

await connectDatabase();

app.listen(Number(PORT), () => {
  console.log(`mcq-service listening on port ${PORT}`);
});
