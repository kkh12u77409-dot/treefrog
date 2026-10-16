import { WebTreeNode } from '../types';

/**
 * Re-serialize a WebTreeNode structure back into a standard TreeForge text tree.
 */
export function treeToText(root: WebTreeNode): string {
  const lines: string[] = [];
  lines.push(`${root.name}/`);

  function formatChildren(parent: WebTreeNode, prefix: string) {
    const total = parent.children.length;
    parent.children.forEach((child, index) => {
      const isLast = index === total - 1;
      const pointer = isLast ? '└── ' : '├── ';
      const name = child.isDir ? `${child.name}/` : child.name;
      lines.push(`${prefix}${pointer}${name}`);

      if (child.isDir && child.children.length > 0) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        formatChildren(child, nextPrefix);
      }
    });
  }

  formatChildren(root, '');
  return lines.join('\n');
}

/**
 * Deep clone a WebTreeNode tree.
 */
export function cloneTree(node: WebTreeNode): WebTreeNode {
  return {
    ...node,
    children: node.children.map(cloneTree),
  };
}

/**
 * Recursively update paths for a node and all of its descendants
 * when moved or renamed under a new parent.
 */
export function recalculateNodePaths(node: WebTreeNode, parentPath: string): void {
  const newPath = `${parentPath}/${node.name}`;
  node.path = newPath;
  node.id = newPath;

  for (const child of node.children) {
    recalculateNodePaths(child, newPath);
  }
}

/**
 * Check if targetFolderPath is inside sourceNode (cannot drop a folder into its own descendants).
 */
export function isDescendantOf(root: WebTreeNode, potentialAncestorPath: string, targetPath: string): boolean {
  if (potentialAncestorPath === targetPath) return true;
  return targetPath.startsWith(`${potentialAncestorPath}/`);
}

/**
 * Add a new file or directory node to a parent directory.
 */
export function addNodeToTree(
  root: WebTreeNode,
  parentPath: string,
  name: string,
  isDir: boolean
): { success: boolean; root: WebTreeNode; message?: string } {
  const cleanName = name.trim().replace(/\/+$/, '');
  if (!cleanName) return { success: false, root, message: 'Name cannot be empty' };

  const cloned = cloneTree(root);
  let targetParent: WebTreeNode | null = null;

  if (cloned.path === parentPath || cloned.name === parentPath) {
    targetParent = cloned;
  } else {
    function find(n: WebTreeNode) {
      if (n.path === parentPath && n.isDir) {
        targetParent = n;
        return;
      }
      n.children.forEach(find);
    }
    find(cloned);
  }

  if (!targetParent) {
    // Fallback to root
    targetParent = cloned;
  }

  // Check duplicate
  const exists = targetParent.children.some(
    (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.isDir === isDir
  );
  if (exists) {
    return { success: false, root, message: `An item named "${cleanName}" already exists in this folder.` };
  }

  const childPath = `${targetParent.path}/${cleanName}`;
  const newNode: WebTreeNode = {
    id: childPath,
    name: cleanName,
    path: childPath,
    isDir,
    children: [],
    enabled: true,
  };

  targetParent.children.push(newNode);
  return { success: true, root: cloned };
}

/**
 * Rename an existing node in the tree.
 */
export function renameNodeInTree(
  root: WebTreeNode,
  targetPath: string,
  newName: string
): { success: boolean; root: WebTreeNode; message?: string } {
  const cleanName = newName.trim().replace(/\/+$/, '');
  if (!cleanName) return { success: false, root, message: 'New name cannot be empty' };

  const cloned = cloneTree(root);

  // If renaming root
  if (cloned.path === targetPath) {
    cloned.name = cleanName;
    cloned.path = cleanName;
    cloned.id = cleanName;
    for (const child of cloned.children) {
      recalculateNodePaths(child, cleanName);
    }
    return { success: true, root: cloned };
  }

  let parentNode: WebTreeNode | null = null;
  let targetIndex = -1;

  function find(n: WebTreeNode) {
    for (let i = 0; i < n.children.length; i++) {
      if (n.children[i].path === targetPath) {
        parentNode = n;
        targetIndex = i;
        return;
      }
      find(n.children[i]);
    }
  }
  find(cloned);

  if (!parentNode || targetIndex === -1) {
    return { success: false, root, message: 'Target node not found' };
  }

  // Check duplicate in same folder
  const conflict = (parentNode as WebTreeNode).children.some(
    (c, i) => i !== targetIndex && c.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (conflict) {
    return { success: false, root, message: `An item named "${cleanName}" already exists in this directory.` };
  }

  const targetNode = (parentNode as WebTreeNode).children[targetIndex];
  targetNode.name = cleanName;
  recalculateNodePaths(targetNode, (parentNode as WebTreeNode).path);

  return { success: true, root: cloned };
}

/**
 * Remove a node from the tree by path.
 */
export function removeNodeFromTree(
  root: WebTreeNode,
  targetPath: string
): { success: boolean; root: WebTreeNode } {
  const cloned = cloneTree(root);

  if (cloned.path === targetPath) {
    // Cannot delete root entirely, clear children instead
    cloned.children = [];
    return { success: true, root: cloned };
  }

  function removeChild(n: WebTreeNode): boolean {
    const idx = n.children.findIndex((c) => c.path === targetPath);
    if (idx !== -1) {
      n.children.splice(idx, 1);
      return true;
    }
    for (const child of n.children) {
      if (removeChild(child)) return true;
    }
    return false;
  }

  removeChild(cloned);
  return { success: true, root: cloned };
}

/**
 * Move a node (sourcePath) into a target folder (targetFolderPath) via Drag and Drop.
 */
export function moveNodeInTree(
  root: WebTreeNode,
  sourcePath: string,
  targetFolderPath: string
): { success: boolean; root: WebTreeNode; message?: string } {
  if (sourcePath === targetFolderPath) {
    return { success: false, root, message: 'Cannot drop an item onto itself' };
  }

  if (isDescendantOf(root, sourcePath, targetFolderPath)) {
    return { success: false, root, message: 'Cannot move a directory into its own subfolder' };
  }

  const cloned = cloneTree(root);

  // 1. Find and extract source node
  let extractedNode: WebTreeNode | null = null;

  function extract(n: WebTreeNode): boolean {
    const idx = n.children.findIndex((c) => c.path === sourcePath);
    if (idx !== -1) {
      extractedNode = n.children.splice(idx, 1)[0];
      return true;
    }
    for (const child of n.children) {
      if (extract(child)) return true;
    }
    return false;
  }
  extract(cloned);

  if (!extractedNode) {
    return { success: false, root, message: 'Source item to move was not found' };
  }

  // 2. Find target folder
  let targetFolder: WebTreeNode | null = null;
  if (cloned.path === targetFolderPath) {
    targetFolder = cloned;
  } else {
    function findTarget(n: WebTreeNode) {
      if (n.path === targetFolderPath && n.isDir) {
        targetFolder = n;
        return;
      }
      n.children.forEach(findTarget);
    }
    findTarget(cloned);
  }

  if (!targetFolder) {
    // If target not found or not dir, fallback to root
    targetFolder = cloned;
  }

  // 3. Check for conflict in target folder
  const existingConflict = targetFolder.children.find(
    (c) => c.name.toLowerCase() === (extractedNode as WebTreeNode).name.toLowerCase()
  );

  if (existingConflict) {
    // Auto-rename like "file (1).py"
    const ext = (extractedNode as WebTreeNode).name.includes('.')
      ? '.' + (extractedNode as WebTreeNode).name.split('.').pop()
      : '';
    const stem = ext ? (extractedNode as WebTreeNode).name.slice(0, -ext.length) : (extractedNode as WebTreeNode).name;
    (extractedNode as WebTreeNode).name = `${stem}_copy${ext}`;
  }

  // 4. Update path and append
  recalculateNodePaths(extractedNode, targetFolder.path);
  targetFolder.children.push(extractedNode);

  return { success: true, root: cloned };
}

/**
 * Duplicate a node inside the same folder.
 */
export function duplicateNodeInTree(
  root: WebTreeNode,
  targetPath: string
): { success: boolean; root: WebTreeNode } {
  const cloned = cloneTree(root);

  let targetParent: WebTreeNode | null = null;
  let targetNode: WebTreeNode | null = null;

  function find(n: WebTreeNode) {
    for (const child of n.children) {
      if (child.path === targetPath) {
        targetParent = n;
        targetNode = child;
        return;
      }
      find(child);
    }
  }
  find(cloned);

  if (!targetParent || !targetNode) {
    return { success: false, root };
  }

  const originalNode = targetNode as WebTreeNode;
  const duplicated = cloneTree(originalNode);

  const ext = originalNode.name.includes('.') ? '.' + originalNode.name.split('.').pop() : '';
  const stem = ext ? originalNode.name.slice(0, -ext.length) : originalNode.name;
  const newName = `${stem}_copy${ext}`;
  duplicated.name = newName;

  recalculateNodePaths(duplicated, (targetParent as WebTreeNode).path);
  (targetParent as WebTreeNode).children.push(duplicated);

  return { success: true, root: cloned };
}
