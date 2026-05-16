import './load-env.js';
import express from 'express';
import { connectDatabase } from './config/database.js';
import './config/firebase.js';
import './models/User.js';
import './models/Exam.js';
import './models/ExamSession.js';
import './models/ExamResult.js';

import healthRoutes from './routes/health.routes.js';
import examRoutes from './routes/exam.routes.js';
import internalRoutes from './routes/internal.routes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(express.json());

app.use('/health', healthRoutes);
app.use('/exams', examRoutes);
app.use('/internal', internalRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

app.use(errorHandler);

const PORT = process.env.PORT;
if (!PORT) {
  console.error('Missing PORT in environment. Set PORT in .env (see .env.example).');
  process.exit(1);
}

await connectDatabase();

app.listen(Number(PORT), () => {
  console.log(`exam-service listening on port ${PORT}`);
});
