import './load-env.js';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const PORT = process.env.PORT ?? 3000;

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Mount targets strip the gateway prefix; pathRewrite maps the remainder onto each
 * service’s expected base path (e.g. auth-service serves `/auth`).
 */
const routes = [
  {
    mount: '/api/auth',
    target: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
    backendPrefix: '/auth',
  },
  // e.g. GET http://localhost:3000/api/users/me → GET http://localhost:3002/users/me
  {
    mount: '/api/users',
    target: process.env.USER_SERVICE_URL ?? 'http://localhost:3002',
    backendPrefix: '/users',
  },
  {
    mount: '/api/taxonomy',
    target: process.env.TAXONOMY_SERVICE_URL ?? 'http://localhost:3003',
    backendPrefix: '/taxonomy',
  },
  {
    mount: '/api/mcqs',
    target: process.env.MCQ_SERVICE_URL ?? 'http://localhost:3004',
    backendPrefix: '/mcqs',
  },
  {
    mount: '/api/exams',
    target: process.env.EXAM_SERVICE_URL ?? 'http://localhost:3005',
    backendPrefix: '/exams',
  },
];

for (const { mount, target, backendPrefix } of routes) {
  app.use(
    mount,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: (path) => backendPrefix + path,
    })
  );
}

const server = app.listen(Number(PORT), () => {
  console.log(`gateway listening on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`gateway: port ${PORT} already in use (another gateway or stale nodemon child)`);
    process.exit(1);
  }
});
