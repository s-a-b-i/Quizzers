import './load-env.js';
import express from 'express';
import { connectDatabase } from './config/database.js';
import userRoutes from './routes/user.routes.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', service: 'user-service' },
  });
});

app.use('/users', userRoutes);

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
      message: 'A profile with this email already exists.',
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
  console.log(`user-service listening on port ${PORT}`);
});
