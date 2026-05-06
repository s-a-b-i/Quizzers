import './load-env.js';
import express from 'express';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'auth-service' } });
});

app.use('/auth', authRoutes);

app.use((err, req, res, next) => {
  if (typeof err?.statusCode === 'number' && err.message) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  const invalidTokenCodes = new Set([
    'auth/id-token-expired',
    'auth/invalid-id-token',
    'auth/argument-error',
  ]);

  if (invalidTokenCodes.has(err?.code)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }

  if (err?.code === 'auth/user-disabled') {
    return res.status(403).json({
      success: false,
      message: 'This account has been disabled.',
    });
  }

  if (err?.code === 'auth/email-already-exists') {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
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
  console.log(`auth-service listening on port ${PORT}`);
});
