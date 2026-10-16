import { WebTreeNode } from '../types';

export interface TreeFilterResult {
  filteredRoot: WebTreeNode | null;
  matchCount: number;
}

/**
 * Recursively filters a WebTreeNode hierarchy by query string.
 * A node is retained if its name or path contains the query (case-insensitive),
 * or if any of its descendants contain the query.
 * Folder nodes that contain matching descendants are retained so hierarchy remains intact.
 */
export function filterTree(root: WebTreeNode | null, query: string): TreeFilterResult {
  if (!root) {
    return { filteredRoot: null, matchCount: 0 };
  }

  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    let total = 0;
    const countNodes = (node: WebTreeNode) => {
      total++;
      node.children.forEach(countNodes);
    };
    countNodes(root);
    return { filteredRoot: root, matchCount: total };
  }

  let matchCount = 0;

  function filterNode(node: WebTreeNode): WebTreeNode | null {
    const isSelfMatch =
      node.name.toLowerCase().includes(cleanQuery) ||
      node.path.toLowerCase().includes(cleanQuery);

    if (isSelfMatch) {
      matchCount++;
    }

    if (!node.isDir) {
      return isSelfMatch ? { ...node, children: [] } : null;
    }

    // For directories: filter children recursively
    const filteredChildren: WebTreeNode[] = [];
    for (const child of node.children) {
      const filteredChild = filterNode(child);
      if (filteredChild) {
        filteredChildren.push(filteredChild);
      }
    }

    // Keep folder if it matches itself or has matching children
    if (isSelfMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  }

  const filteredRoot = filterNode(root);
  return { filteredRoot, matchCount };
}
