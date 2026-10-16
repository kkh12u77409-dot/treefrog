import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to recursively get all files in TreeForge
function getTreeForgeFiles(dir: string, baseDir: string = dir): Array<{ path: string; name: string; content: string; isDir: boolean }> {
  const results: Array<{ path: string; name: string; content: string; isDir: boolean }> = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['__pycache__', '.pytest_cache', '.git'].includes(entry.name) || entry.name.endsWith('.pyc') || entry.name.endsWith('.zip')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push({ path: relPath, name: entry.name, content: '', isDir: true });
      results.push(...getTreeForgeFiles(fullPath, baseDir));
    } else {
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        content = '[Binary or unreadable file]';
      }
      results.push({ path: relPath, name: entry.name, content, isDir: false });
    }
  }
  return results;
}

// API: Get all files of TreeForge desktop app
app.get('/api/python-files', (req, res) => {
  try {
    const treeForgeDir = path.join(__dirname, 'TreeForge');
    const files = getTreeForgeFiles(treeForgeDir);
    res.json({ success: true, files });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Download packaged ZIP of TreeForge desktop app
app.get('/api/download-zip', (req, res) => {
  const zipPath = path.join(__dirname, 'TreeForge', 'TreeForge_Package.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="TreeForge_PyQt6_App.zip"');
    res.setHeader('Content-Type', 'application/zip');
    fs.createReadStream(zipPath).pipe(res);
  } else {
    res.status(404).json({ error: 'ZIP file not found. Run make_zip.py first.' });
  }
});

// API: AI Tree Architect (High Thinking Mode)
app.post('/api/generate-ai-tree', async (req, res) => {
  try {
    const { prompt, language = 'ar' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `You are a Principal Software Architect and PyQt6 Desktop Engineering Expert.
The user wants to scaffold a new software project.
You must analyze their requirements deeply, think through the optimal modular folder structure, clean architecture, separation of concerns, and produce:
1. An elegant text project tree format compatible with TreeForge (using box drawing like ├── and └──, trailing slashes for folders, and inline groups like "ui/ (win.py, style.py)").
2. Production starter code for 2-4 key files, separated by "### <relative_path>" markers.

Return ONLY a JSON object with this exact schema:
{
  "projectName": "NameOfProject",
  "summary": "Short explanation of the architecture and decisions",
  "treeText": "ProjectName/\\n├── main.py\\n...",
  "batchCode": "### main.py\\n...\\n\\n### core/service.py\\n..."
}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nUser Request: ${prompt}\nLanguage Preference: ${language}`,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (modelErr: any) {
      console.warn('Primary model error, attempting retry:', modelErr.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nUser Request: ${prompt}\nLanguage Preference: ${language}`,
      });
    }

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        projectName: 'CustomProject',
        summary: 'Generated project architecture',
        treeText: text,
        batchCode: '',
      };
    }

    res.json({ success: true, data });
  } catch (err: any) {
    console.error('AI Architect Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate project with AI' });
  }
});

// Vite middleware integration in development / static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TreeForge Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
