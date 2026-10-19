import { WebFileChunk, MatchStatus, NewlineMode } from '../types';

export function stripCodeFences(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    const lines = trimmed.split('\n');
    if (lines.length >= 2 && lines[0].startsWith('```') && lines[lines.length - 1].startsWith('```')) {
      return lines.slice(1, -1).join('\n');
    }
  }
  return content;
}

export function sanitizePath(raw: string): string {
  let clean = raw.trim().replace(/^[`'"*: ]+|[`'"*: ]+$/g, '');
  clean = clean.replace(/^(?:FILE|File|file):\s*/, '');
  clean = clean.replace(/\\/g, '/');
  clean = clean.replace(/^(?:\.\/|\/)+/, '');
  return clean;
}

const COMMON_EXTS = ['.py', '.txt', '.md', '.json', '.toml', '.yaml', '.yml', '.html', '.css', '.js', '.ts', '.jsx', '.tsx'];
const KNOWN_FILES = ['dockerfile', 'makefile', 'license', '.gitignore', 'procfile'];

function looksLikeFile(p: string): boolean {
  const lower = p.toLowerCase();
  if (KNOWN_FILES.includes(lower)) return true;
  const parts = lower.split('/');
  const last = parts[parts.length - 1];
  if (last.includes('.') && !last.startsWith('.')) {
    const ext = '.' + last.split('.').pop();
    return COMMON_EXTS.includes(ext) || ext.length <= 5;
  }
  return false;
}

export function splitContent(text: string, candidatePaths: string[] = [], stripFences = true): WebFileChunk[] {
  if (!text.trim()) return [];

  const markers: Array<{ regex: RegExp; type: string }> = [
    { regex: /^(?:\/\/|\/\*)\s*(?:FILE|File|file):\s*([^\n\r*]+?)(?:\s*\*\/)?$/gm, type: 'slash_file' },
    { regex: /^#\s*(?:FILE|File|file):\s*([^\n\r]+?)\s*$/gm, type: 'hash_file' },
    { regex: /^[=]{3,}\s*([^\n\r]+?)\s*[=]{3,}$/gm, type: 'triple_equal' },
    { regex: /^-{3,}\s*([^\n\r]+?)\s*-{3,}$/gm, type: 'triple_dash' },
    { regex: /^```[a-zA-Z0-9_-]*(?::\s*|\s+(?:title|filename|file)=["'])([^"'\n\r]+)["']?\s*$/gm, type: 'fence_info' },
    { regex: /^(?:#{1,6})\s+([^\n\r`]+?)\s*$/gm, type: 'markdown_heading' },
    { regex: /^\*\*([^\n\r*`]+?)\*\*\s*$/gm, type: 'bold_filename' },
  ];

  const matches: Array<{ start: number; end: number; path: string; type: string }> = [];

  for (const { regex, type } of markers) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const rawPath = m[1];
      const clean = sanitizePath(rawPath);
      if (!clean || clean.startsWith('http') || clean.includes('\n')) continue;

      if (type === 'markdown_heading' || type === 'bold_filename') {
        const after = text.slice(m.index + m[0].length, m.index + m[0].length + 150).trimStart();
        const fenceFollowing = after.startsWith('```');
        const isFile = looksLikeFile(clean);
        if (!isFile && !fenceFollowing) continue;
      }

      matches.push({ start: m.index, end: m.index + m[0].length, path: clean, type });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const filtered: Array<{ start: number; end: number; path: string; type: string }> = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  if (filtered.length === 0) {
    const body = stripFences ? stripCodeFences(text) : text;
    return [{
      id: 'chunk_1',
      rawTargetPath: '',
      resolvedPath: '',
      content: body,
      matchStatus: 'not_found',
      candidatePaths: candidatePaths.slice(0, 5),
      lineCount: body.split('\n').length,
      sizeBytes: new Blob([body]).size,
      included: true,
      markerType: 'whole_file',
    }];
  }

  const chunks: WebFileChunk[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const cur = filtered[i];
    const nextStart = i + 1 < filtered.length ? filtered[i + 1].start : text.length;
    let body = text.slice(cur.end, nextStart).trim();
    if (stripFences) body = stripCodeFences(body);

    const chunk: WebFileChunk = {
      id: `chunk_${i + 1}`,
      rawTargetPath: cur.path,
      resolvedPath: cur.path,
      content: body,
      matchStatus: 'not_found',
      candidatePaths: [],
      lineCount: body.split('\n').length,
      sizeBytes: new Blob([body]).size,
      included: true,
      markerType: cur.type,
    };

    // Match against candidate paths
    resolveChunkMatch(chunk, candidatePaths);
    chunks.push(chunk);
  }

  return chunks;
}

function resolveChunkMatch(chunk: WebFileChunk, candidates: string[]): void {
  const raw = chunk.rawTargetPath.trim().toLowerCase();
  if (!raw || candidates.length === 0) return;

  // 1. Exact match
  const exact = candidates.find(c => c.toLowerCase() === raw || c.toLowerCase().endsWith('/' + raw));
  if (exact) {
    chunk.matchStatus = 'matched';
    chunk.resolvedPath = exact;
    return;
  }

  // 2. Unique filename match
  const fname = raw.split('/').pop() || '';
  const matchingFnames = candidates.filter(c => (c.split('/').pop() || '').toLowerCase() === fname);
  if (matchingFnames.length === 1) {
    chunk.matchStatus = 'matched';
    chunk.resolvedPath = matchingFnames[0];
    return;
  } else if (matchingFnames.length > 1) {
    chunk.matchStatus = 'ambiguous';
    chunk.candidatePaths = matchingFnames;
    chunk.resolvedPath = matchingFnames[0];
    return;
  }

  // 3. Fallback fuzzy
  const partial = candidates.filter(c => c.toLowerCase().includes(fname));
  if (partial.length === 1) {
    chunk.matchStatus = 'matched';
    chunk.resolvedPath = partial[0];
  } else if (partial.length > 1) {
    chunk.matchStatus = 'ambiguous';
    chunk.candidatePaths = partial;
    chunk.resolvedPath = partial[0];
  } else {
    chunk.matchStatus = 'not_found';
    chunk.candidatePaths = candidates.slice(0, 5);
  }
}
