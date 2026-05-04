import 'dotenv/config';
import express from 'express';

const PORT = process.env.PORT ?? 3003;

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'taxonomy-service' });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.listen(Number(PORT), () => {
  console.log(`taxonomy-service listening on port ${PORT}`);
});
