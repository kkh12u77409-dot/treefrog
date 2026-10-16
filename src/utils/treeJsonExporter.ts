import { WebTreeNode, CollisionPolicy } from '../types';

export interface ExportedTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  type: 'folder' | 'file';
  extension: string;
  enabled: boolean;
  content?: string;
  children?: ExportedTreeNode[];
}

export interface ProjectTreeJsonExport {
  schemaVersion: '1.0.0';
  generator: 'TreeForge';
  exportedAt: string;
  projectName: string;
  config: {
    collisionPolicy: CollisionPolicy;
    addInitPy: boolean;
    starterContent: boolean;
    disabledNodePaths: string[];
  };
  stats: {
    totalFolders: number;
    totalFiles: number;
    totalNodes: number;
    enabledNodes: number;
  };
  treeText: string;
  tree: ExportedTreeNode;
  flatNodes: Array<{
    name: string;
    path: string;
    isDir: boolean;
    enabled: boolean;
  }>;
}

export interface ExportJsonOptions {
  policy?: CollisionPolicy;
  addInitPy?: boolean;
  starterContent?: boolean;
  treeText?: string;
  disabledNodePaths?: string[];
}

const STARTER_TEMPLATES: Record<string, string> = {
  '.py': '"""Module documentation."""\n\n\ndef main() -> None:\n    """Main entry point."""\n    pass\n\n\nif __name__ == "__main__":\n    main()\n',
  '.md': '# {projectName}\n\nProject overview, installation, and usage instructions.\n\n## Getting Started\n\n```bash\npip install -r requirements.txt\npython main.py\n```\n',
  '.gitignore': '__pycache__/\n*.py[cod]\n*$py.class\n.env\n.venv/\nenv/\n.idea/\n.vscode/\n*.bak\n',
  '.json': '{\n  "version": "1.0.0"\n}\n',
  '.txt': '# {projectName} notes\n',
};

function getFileExtension(name: string): string {
  if (!name.includes('.')) return '';
  const idx = name.lastIndexOf('.');
  return name.slice(idx).toLowerCase();
}

/**
 * Transforms a WebTreeNode tree into a clean JSON export representation
 */
export function buildProjectTreeJson(
  root: WebTreeNode,
  options: ExportJsonOptions = {}
): ProjectTreeJsonExport {
  const {
    policy = 'skip',
    addInitPy = false,
    starterContent = false,
    treeText = '',
    disabledNodePaths = [],
  } = options;

  let totalFolders = 0;
  let totalFiles = 0;
  let totalNodes = 0;
  let enabledNodes = 0;
  const flatNodes: Array<{
    name: string;
    path: string;
    isDir: boolean;
    enabled: boolean;
  }> = [];

  function mapNode(node: WebTreeNode): ExportedTreeNode {
    totalNodes++;
    if (node.enabled) enabledNodes++;

    if (node.isDir) {
      totalFolders++;
    } else {
      totalFiles++;
    }

    flatNodes.push({
      name: node.name,
      path: node.path,
      isDir: node.isDir,
      enabled: node.enabled,
    });

    const ext = node.isDir ? '' : getFileExtension(node.name);

    let content = node.content;
    if (!content && starterContent && !node.isDir) {
      if (STARTER_TEMPLATES[ext]) {
        content = STARTER_TEMPLATES[ext].replace('{projectName}', root.name);
      } else if (node.name === 'requirements.txt') {
        content = '# Project dependencies\n';
      }
    }

    const exported: ExportedTreeNode = {
      name: node.name,
      path: node.path,
      isDir: node.isDir,
      type: node.isDir ? 'folder' : 'file',
      extension: ext,
      enabled: node.enabled,
    };

    if (content !== undefined && content !== '') {
      exported.content = content;
    }

    if (node.isDir) {
      exported.children = (node.children || []).map(mapNode);
    }

    return exported;
  }

  const exportedTree = mapNode(root);

  return {
    schemaVersion: '1.0.0',
    generator: 'TreeForge',
    exportedAt: new Date().toISOString(),
    projectName: root.name,
    config: {
      collisionPolicy: policy,
      addInitPy,
      starterContent,
      disabledNodePaths,
    },
    stats: {
      totalFolders,
      totalFiles,
      totalNodes,
      enabledNodes,
    },
    treeText: treeText || '',
    tree: exportedTree,
    flatNodes,
  };
}

/**
 * Triggers a browser download of the tree structure as a formatted JSON file
 */
export function downloadTreeJson(
  root: WebTreeNode,
  options: ExportJsonOptions = {}
): string {
  const jsonObject = buildProjectTreeJson(root, options);
  const jsonString = JSON.stringify(jsonObject, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  const filename = `${root.name || 'project'}_tree_structure.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}
