import { getStarterContent } from './starterTemplates';
import { validateName } from './pathSafety';
import JSZip from 'jszip';
import { WebTreeNode } from '../types';

function hasPythonDescendant(node: WebTreeNode): boolean {
  for (const c of node.children) {
    if (!c.enabled) continue;
    if (!c.isDir && c.name.endsWith('.py')) return true;
    if (c.isDir && hasPythonDescendant(c)) return true;
  }
  return false;
}

export async function exportProjectZip(
  root: WebTreeNode,
  options: { addInitPy: boolean; starterContent: boolean }
): Promise<Blob> {
  const zip = new JSZip();

  function walk(node: WebTreeNode, currentFolder: JSZip) {
    if (!node.enabled) return;
    validateName(node.name);

    if (node.isDir) {
      const subFolder = currentFolder.folder(node.name) || currentFolder;
      if (options.addInitPy && hasPythonDescendant(node) && !node.children.some(c => c.name === '__init__.py')) {
        subFolder.file('__init__.py', '"""Package initialization."""\n');
      }
      for (const child of node.children) {
        walk(child, subFolder);
      }
    } else {
      let content = node.content ?? '';
      if (node.content === undefined && options.starterContent) {
        content = getStarterContent(node.name, root.name);
      }
      currentFolder.file(node.name, content);
    }
  }

  walk(root, zip);

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
