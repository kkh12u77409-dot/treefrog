import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';
import { createApp } from './server/app';

dotenv.config({ path: ['.env.local', '.env'] });
const root = path.dirname(fileURLToPath(import.meta.url));
const app = createApp({ root });
const port = Number(process.env.PORT || 3000);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root, 'dist')));
    app.get('*', (_req, res) => { res.sendFile(path.join(root, 'dist', 'index.html')); });
  }
  const server = app.listen(port, '0.0.0.0', () => console.log(`TreeForge listening on port ${port}`));
  server.on('error', error => { console.error('Server failed to start:', error); process.exitCode = 1; });
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
startServer().catch(error => { console.error('Startup failed:', error); process.exitCode = 1; });
