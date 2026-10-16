import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  treeToText, 
  addNodeToTree, 
  renameNodeInTree, 
  removeNodeFromTree, 
  moveNodeInTree,
  duplicateNodeInTree 
} from './treeOperations';
import { WebTreeNode } from '../types';

function createSampleTree(): WebTreeNode {
  return {
    id: 'App',
    name: 'App',
    path: 'App',
    isDir: true,
    enabled: true,
    children: [
      {
        id: 'App/main.py',
        name: 'main.py',
        path: 'App/main.py',
        isDir: false,
        enabled: true,
        children: [],
      },
      {
        id: 'App/core',
        name: 'core',
        path: 'App/core',
        isDir: true,
        enabled: true,
        children: [
          {
            id: 'App/core/calc.py',
            name: 'calc.py',
            path: 'App/core/calc.py',
            isDir: false,
            enabled: true,
            children: [],
          },
        ],
      },
    ],
  };
}

test('treeToText correctly formats tree with box drawing chars', () => {
  const tree = createSampleTree();
  const text = treeToText(tree);
  assert.ok(text.startsWith('App/'));
  assert.ok(text.includes('├── main.py'));
  assert.ok(text.includes('└── core/'));
  assert.ok(text.includes('calc.py'));
});

test('addNodeToTree adds file to folder', () => {
  const tree = createSampleTree();
  const res = addNodeToTree(tree, 'App/core', 'utils.py', false);
  assert.equal(res.success, true);
  const coreNode = res.root.children.find((c) => c.name === 'core');
  assert.ok(coreNode);
  const utils = coreNode?.children.find((c) => c.name === 'utils.py');
  assert.ok(utils);
  assert.equal(utils?.path, 'App/core/utils.py');
});

test('renameNodeInTree renames file and updates path', () => {
  const tree = createSampleTree();
  const res = renameNodeInTree(tree, 'App/core/calc.py', 'calculator.py');
  assert.equal(res.success, true);
  const coreNode = res.root.children.find((c) => c.name === 'core');
  const renamed = coreNode?.children.find((c) => c.name === 'calculator.py');
  assert.ok(renamed);
  assert.equal(renamed?.path, 'App/core/calculator.py');
});

test('removeNodeFromTree removes file', () => {
  const tree = createSampleTree();
  const res = removeNodeFromTree(tree, 'App/main.py');
  assert.equal(res.success, true);
  const main = res.root.children.find((c) => c.name === 'main.py');
  assert.equal(main, undefined);
});

test('moveNodeInTree moves node across folders (Drag and Drop simulation)', () => {
  const tree = createSampleTree();
  // Move main.py from App into App/core
  const res = moveNodeInTree(tree, 'App/main.py', 'App/core');
  assert.equal(res.success, true);

  // main.py should no longer be at root
  const atRoot = res.root.children.find((c) => c.name === 'main.py');
  assert.equal(atRoot, undefined);

  // main.py should be inside core
  const coreNode = res.root.children.find((c) => c.name === 'core');
  const insideCore = coreNode?.children.find((c) => c.name === 'main.py');
  assert.ok(insideCore);
  assert.equal(insideCore?.path, 'App/core/main.py');
});

test('duplicateNodeInTree clones file in folder', () => {
  const tree = createSampleTree();
  const res = duplicateNodeInTree(tree, 'App/main.py');
  assert.equal(res.success, true);
  const dup = res.root.children.find((c) => c.name === 'main_copy.py');
  assert.ok(dup);
});
