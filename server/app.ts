import { aiResultSchema } from '../src/utils/aiSchema';
import express from 'express';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

const requestSchema = z.object({ prompt: z.string().trim().min(1).max(6000), language: z.enum(['ar', 'en']).default('ar') }).strict();
const textExtensions = new Set(['.py', '.md', '.txt', '.svg', '.iss', '.bat', '.json', '.toml', '.yaml', '.yml']);
interface SourceFile { path: string; name: string; content: string; isDir: boolean }
interface AppOptions {
  root: string;
  env?: NodeJS.ProcessEnv;
  generate?: (prompt: string, language: string) => Promise<string>;
}

export function createApp({ root, env = process.env, generate }: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  // CSP is enabled in production; dev Vite needs inline transforms and WebSockets.
  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' ? { directives: {
    'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'], 'img-src': ["'self'", 'data:', 'blob:'],
  } } : false, crossOriginEmbedderPolicy: false, frameguard: false }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(express.json({ limit: '32kb' }));
  let cache: { expires: number; files: SourceFile[] } | null = null;
  let pending: Promise<SourceFile[]> | null = null;
  async function sources(): Promise<SourceFile[]> {
    if (cache && cache.expires > Date.now()) return cache.files;
    if (pending) return pending;
    const base = path.join(root, 'TreeForge');
    async function walk(dir: string): Promise<SourceFile[]> {
      const result: SourceFile[] = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith('.') || ['__pycache__', 'node_modules', 'build', 'dist', 'screenshots'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        const relative = path.relative(base, full).split(path.sep).join('/');
        // Do not follow symlinks or serve unbounded/binary files.
        if (entry.isDirectory()) {
          result.push({ path: relative, name: entry.name, content: '', isDir: true }, ...await walk(full));
        } else if (entry.isFile() && (textExtensions.has(path.extname(entry.name).toLowerCase()) || entry.name === 'LICENSE')) {
          if ((await fs.stat(full)).size > 512_000) continue;
          result.push({ path: relative, name: entry.name, content: await fs.readFile(full, 'utf8'), isDir: false });
        }
      }
      return result;
    }
    pending = walk(base);
    try { const files = await pending; cache = { files, expires: Date.now() + 30_000 }; return files; }
    finally { pending = null; }
  }
  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/api/python-files', async (_req, res) => {
    try { res.json({ success: true, files: await sources() }); }
    catch (error) { console.error('Source listing failed', error); res.status(500).json({ error: 'Source listing unavailable' }); }
  });
  app.get('/api/download-zip', (_req, res) => {
    res.download(path.join(root, 'TreeForge', 'TreeForge_Package.zip'), 'TreeForge_PyQt6_App.zip', error => {
      if (error && !res.headersSent) res.status(404).json({ error: 'Desktop package unavailable. Run npm run package:desktop.' });
    });
  });
  let active = 0;
  let daily = { day: Math.floor(Date.now() / 86_400_000), count: 0 };
  app.post('/api/generate-ai-tree', rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }), async (req, res) => {
    const origin = req.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== req.get('host') && origin !== env.PUBLIC_ORIGIN) {
          res.status(403).json({ error: 'Origin is not allowed' }); return;
        }
      } catch { res.status(403).json({ error: 'Invalid origin' }); return; }
    }
    if (env.AI_ACCESS_TOKEN) {
      const expected = Buffer.from(`Bearer ${env.AI_ACCESS_TOKEN}`);
      const actual = Buffer.from(req.get('authorization') || '');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        res.status(401).json({ error: 'AI access token is required' }); return;
      }
    } else if (env.ALLOW_PUBLIC_AI !== 'true') {
      res.status(503).json({ error: 'AI access is disabled. Configure AI_ACCESS_TOKEN or explicitly allow public AI.' }); return;
    }
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Prompt must be 1–6000 characters and language must be ar or en' }); return; }
    if (!generate && !env.GEMINI_API_KEY) { res.status(503).json({ error: 'AI service is not configured' }); return; }
    const day = Math.floor(Date.now() / 86_400_000);
    if (day !== daily.day) daily = { day, count: 0 };
    const configuredLimit = Number(env.AI_DAILY_LIMIT || 100);
    const dailyLimit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 100;
    if (active >= 2 || daily.count >= dailyLimit) { res.status(429).json({ error: 'AI usage limit reached; try later' }); return; }
    active++; daily.count++;
    try {
      const { prompt, language } = parsed.data;
      const text = generate ? await generate(prompt, language) : (await new GoogleGenAI({
        apiKey: env.GEMINI_API_KEY!, httpOptions: { timeout: 45_000 },
      }).models.generateContent({ model: env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: `You are a software architect. Return a JSON object with projectName, summary, treeText and batchCode strings. treeText must be a relative project tree using box drawing characters and trailing slashes for folders. batchCode must contain starter code for 2-4 key files separated by ### relative_path markers. Do not include unsafe or absolute paths. Write explanations in ${language === 'ar' ? 'Arabic' : 'English'}.`,
          responseMimeType: 'application/json', maxOutputTokens: 8192 },
      })).text;
      const data = aiResultSchema.parse(JSON.parse(text || ''));
      res.json({ success: true, data });
    } catch (error) {
      console.error('AI generation failed', error);
      res.status(502).json({ error: 'AI returned an invalid result or is unavailable. Please try again later.' });
    } finally { active--; }
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found' }); });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500;
    res.status(status === 413 ? 413 : status === 400 ? 400 : 500).json({ error: status === 413 ? 'Request too large' : status === 400 ? 'Invalid JSON request' : 'Internal server error' });
  });
  return app;
}
