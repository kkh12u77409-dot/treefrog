import JSZip from 'jszip';
import { WebTreeNode } from '../types';

const STARTER_TEMPLATES: Record<string, string> = {
  '.py': '"""Module documentation."""\n\n\ndef main() -> None:\n    """Main entry point."""\n    pass\n\n\nif __name__ == "__main__":\n    main()\n',
  '.md': '# {projectName}\n\nProject overview, installation, and usage instructions.\n\n## Getting Started\n\n```bash\npip install -r requirements.txt\npython main.py\n```\n',
  '.gitignore': '__pycache__/\n*.py[cod]\n*$py.class\n.env\n.venv/\nenv/\n.idea/\n.vscode/\n*.bak\n',
  '.json': '{\n  "version": "1.0.0"\n}\n',
  '.txt': '# {projectName} notes\n',
};

function hasPythonDescendant(node: WebTreeNode): boolean {
  for (const c of node.children) {
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

    if (node.isDir) {
      const subFolder = currentFolder.folder(node.name) || currentFolder;
      if (options.addInitPy && hasPythonDescendant(node)) {
        subFolder.file('__init__.py', '"""Package initialization."""\n');
      }
      for (const child of node.children) {
        walk(child, subFolder);
      }
    } else {
      let content = node.content || '';
      if (!content && options.starterContent) {
        const ext = '.' + node.name.split('.').pop()?.toLowerCase();
        const tpl = STARTER_TEMPLATES[ext];
        if (tpl) {
          content = tpl.replace('{projectName}', root.name);
        } else if (node.name === 'requirements.txt') {
          content = '# Project dependencies\n';
        }
      }
      currentFolder.file(node.name, content);
    }
  }

  // If root is dir
  if (root.isDir) {
    const rootFolder = zip.folder(root.name) || zip;
    for (const child of root.children) {
      walk(child, rootFolder);
    }
  } else {
    zip.file(root.name, root.content || '');
  }

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
