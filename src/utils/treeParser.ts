import { validateName, validateRelativePath } from './pathSafety';
import { WebTreeNode, WebParseError, WebParseResult } from '../types';

const WINDOWS_RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

const ILLEGAL_CHARS = new Set(['<', '>', ':', '"', '|', '?', '*']);

export function cleanLineComment(line: string): string {
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      if (!inQuote) {
        inQuote = true;
        quoteChar = ch;
      } else if (quoteChar === ch) {
        inQuote = false;
      }
    } else if (ch === '#' && !inQuote) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

export function parseInlineGroup(text: string): { parent: string; children: string[] } {
  const match = text.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (!match) return { parent: text, children: [] };

  const parent = match[1].trim();
  const inside = match[2].trim();
  if (!inside) return { parent, children: [] };

  const parts = inside.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  return { parent, children: parts };
}

export function validateSegment(seg: string, lineNum: number, fullPath: string): string | null {
  try { validateName(seg); } catch (error) { return `Line ${lineNum}: ${String(error)}`; }
  if (!seg) return `Line ${lineNum}: Path segment cannot be empty in '${fullPath}'`;
  if (seg.endsWith('.') || seg.endsWith(' ')) return `Line ${lineNum}: Segment '${seg}' cannot end with dot or space`;
  if (seg === '.' || seg === '..') return `Line ${lineNum}: Path traversal '${seg}' is prohibited`;
  for (const ch of seg) {
    if (ILLEGAL_CHARS.has(ch)) return `Line ${lineNum}: Illegal character '${ch}' in '${seg}'`;
  }
  const base = seg.split('.')[0].toUpperCase();
  if (WINDOWS_RESERVED.has(base)) return `Line ${lineNum}: Reserved device name '${base}' in '${seg}'`;
  return null;
}

export function parseTreeText(text: string, defaultRootName: string = 'MyProject'): WebParseResult {
  const result: WebParseResult = {
    root: null,
    errors: [],
    totalFolders: 0,
    totalFiles: 0,
  };

  try { validateName(defaultRootName); } catch { defaultRootName = 'MyProject'; }
  const rawLines = text.split('\n');
  const cleanEntries: Array<{ lineNum: number; depth: number; content: string }> = [];
  const indents = rawLines.filter(line => !/[│├└|]/.test(line)).map(line => line.match(/^[ \t]+/)?.[0].replace(/\t/g, '    ').length || 0).filter(Boolean);
  const indentUnit = indents.length ? Math.min(...indents) : 4;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    const stripped = line.trim();
    if (stripped.startsWith('```')) {
      continue;
    }
    if (!stripped) continue;

    const cleaned = cleanLineComment(line);
    const boxMatch = cleaned.match(/^(?:[\s│|]*)(?:├──|└──|\|\-\-|\`\-\-|\+\-\-|\-\-|\-|\*|\>)?\s*/);
    const indentPart = boxMatch ? boxMatch[0] : '';
    let content = cleaned.slice(indentPart.length).trim();
    content = content.replace(/^[*\-]\s+/, '').trim();

    const expanded = cleaned.replace(/\t/g, '    ');
    const branch = /(?:├──|└──|\|--|`--|\+--|--)/.exec(expanded);
    const leading = expanded.match(/^ */)?.[0].length || 0;
    const depth = branch ? Math.floor(branch.index / 4) + 1 : Math.floor(leading / indentUnit) + (/^[-*>]\s/.test(expanded.trimStart()) ? 1 : 0);


    if (content) {
      cleanEntries.push({ lineNum: idx + 1, depth, content });
    }
  }

  if (cleanEntries.length === 0) {
    result.errors.push({ lineNumber: 1, rawText: '', message: 'Tree text is empty.' });
    return result;
  }

  // Root detection
  const first = cleanEntries[0];
  let rootName = defaultRootName;
  let hasRootLine = false;

  if (first.content.endsWith('/') || (cleanEntries.length > 1 && first.depth < cleanEntries[1].depth)) {
    const cleanRoot = first.content.replace(/\/+$/, '');
    const err = validateSegment(cleanRoot, first.lineNum, cleanRoot);
    if (err) {
      result.errors.push({ lineNumber: first.lineNum, rawText: first.content, message: err });
    } else {
      rootName = cleanRoot;
      hasRootLine = true;
    }
  }

  const rootNode: WebTreeNode = {
    id: 'root',
    name: rootName,
    path: rootName,
    isDir: true,
    children: [],
    enabled: true,
    lineNumber: hasRootLine ? first.lineNum : undefined,
  };
  result.root = rootNode;

  const stack: Array<{ depth: number; node: WebTreeNode }> = [{ depth: 0, node: rootNode }];
  const existingPaths = new Set<string>([rootName.toLowerCase()]);
  const startIdx = hasRootLine ? 1 : 0;

  for (let i = startIdx; i < cleanEntries.length; i++) {
    const { lineNum, depth, content } = cleanEntries[i];
    const { parent: parentText, children: inlineChildren } = parseInlineGroup(content);

    if (parentText.split(/[\\/]/).includes('..') || /^[\\/]/.test(parentText) || /^[a-zA-Z]:/.test(parentText)) {
      result.errors.push({ lineNumber: lineNum, rawText: content, message: `Path traversal/absolute path forbidden: ${parentText}` });
      continue;
    }

    const isDir = parentText.endsWith('/') || inlineChildren.length > 0;
    const cleanParent = parentText.replace(/\/+$/, '');
    const segments = cleanParent.split(/[\\/]/).map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) continue;

    let segErr = false;
    for (const seg of segments) {
      const err = validateSegment(seg, lineNum, cleanParent);
      if (err) {
        result.errors.push({ lineNumber: lineNum, rawText: content, message: err });
        segErr = true;
        break;
      }
    }
    if (segErr) continue;

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    let walk = stack[stack.length - 1].node;

    // Intermediate dirs
    for (const seg of segments.slice(0, -1)) {
      const segPath = `${walk.path}/${seg}`;
      let found = walk.children.find(c => c.name.toLowerCase() === seg.toLowerCase() && c.isDir);
      if (!found) {
        found = {
          id: segPath,
          name: seg,
          path: segPath,
          isDir: true,
          children: [],
          enabled: true,
          lineNumber: lineNum,
        };
        walk.children.push(found);
        existingPaths.add(segPath.toLowerCase());
      }
      walk = found;
    }

    const finalName = segments[segments.length - 1];
    const finalPath = `${walk.path}/${finalName}`;

    if (existingPaths.has(finalPath.toLowerCase())) {
      result.errors.push({ lineNumber: lineNum, rawText: content, message: `Duplicate path: ${finalPath}` });
      continue;
    }

    const newNode: WebTreeNode = {
      id: finalPath,
      name: finalName,
      path: finalPath,
      isDir,
      children: [],
      enabled: true,
      lineNumber: lineNum,
    };
    walk.children.push(newNode);
    existingPaths.add(finalPath.toLowerCase());

    if (isDir) {
      stack.push({ depth, node: newNode });
    }

    // Inline children
    for (const childStr of inlineChildren) {
      const childIsDir = childStr.endsWith('/');
      const cleanChild = childStr.replace(/\/+$/, '');
      try { validateRelativePath(cleanChild); } catch (error) {
        result.errors.push({ lineNumber: lineNum, rawText: content, message: String(error) });
        continue;
      }
      const childSegs = cleanChild.split(/[\\/]/).map(s => s.trim()).filter(Boolean);
      if (childSegs.length === 0) continue;

      let childWalk = newNode;
      for (const cs of childSegs.slice(0, -1)) {
        const csPath = `${childWalk.path}/${cs}`;
        let cFound = childWalk.children.find(c => c.name.toLowerCase() === cs.toLowerCase() && c.isDir);
        if (!cFound) {
          cFound = {
            id: csPath,
            name: cs,
            path: csPath,
            isDir: true,
            children: [],
            enabled: true,
            lineNumber: lineNum,
          };
          childWalk.children.push(cFound);
          existingPaths.add(csPath.toLowerCase());
        }
        childWalk = cFound;
      }

      const cName = childSegs[childSegs.length - 1];
      const cPath = `${childWalk.path}/${cName}`;
      if (existingPaths.has(cPath.toLowerCase())) {
        result.errors.push({ lineNumber: lineNum, rawText: content, message: `Duplicate inline child: ${cPath}` });
        continue;
      }

      childWalk.children.push({
        id: cPath,
        name: cName,
        path: cPath,
        isDir: childIsDir,
        children: [],
        enabled: true,
        lineNumber: lineNum,
      });
      existingPaths.add(cPath.toLowerCase());
    }
  }

  // Count items
  function count(n: WebTreeNode) {
    if (n.isDir) result.totalFolders++;
    else result.totalFiles++;
    n.children.forEach(count);
  }
  if (result.root) count(result.root);

  return result;
}
