import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTree } from './treeFilter.ts';
import { WebTreeNode } from '../types/index.ts';

const mockTree: WebTreeNode = {
  id: 'node-root',
  name: 'MyProject',
  path: 'MyProject',
  isDir: true,
  enabled: true,
  children: [
    {
      id: 'node-src',
      name: 'src',
      path: 'MyProject/src',
      isDir: true,
      enabled: true,
      children: [
        {
          id: 'node-app',
          name: 'App.tsx',
          path: 'MyProject/src/App.tsx',
          isDir: false,
          enabled: true,
          children: [],
        },
        {
          id: 'node-api',
          name: 'api.ts',
          path: 'MyProject/src/api.ts',
          isDir: false,
          enabled: true,
          children: [],
        },
      ],
    },
    {
      id: 'node-tests',
      name: 'tests',
      path: 'MyProject/tests',
      isDir: true,
      enabled: true,
      children: [
        {
          id: 'node-test-app',
          name: 'test_app.py',
          path: 'MyProject/tests/test_app.py',
          isDir: false,
          enabled: true,
          children: [],
        },
      ],
    },
    {
      id: 'node-readme',
      name: 'README.md',
      path: 'MyProject/README.md',
      isDir: false,
      enabled: true,
      children: [],
    },
  ],
};

test('filterTree with empty query returns entire tree', () => {
  const result = filterTree(mockTree, '');
  assert.equal(result.filteredRoot !== null, true);
  assert.equal(result.filteredRoot?.children.length, 3);
  assert.equal(result.matchCount, 7); // Root + 2 folders + 4 files = 7
});

test('filterTree filters by file name and preserves parent folders', () => {
  const result = filterTree(mockTree, 'App.tsx');
  assert.equal(result.filteredRoot !== null, true);
  assert.equal(result.filteredRoot?.name, 'MyProject');
  // Only 'src' should be retained under MyProject
  assert.equal(result.filteredRoot?.children.length, 1);
  assert.equal(result.filteredRoot?.children[0].name, 'src');
  // Inside 'src', only 'App.tsx' should be retained
  assert.equal(result.filteredRoot?.children[0].children.length, 1);
  assert.equal(result.filteredRoot?.children[0].children[0].name, 'App.tsx');
  assert.equal(result.matchCount, 1);
});

test('filterTree filters by folder name and keeps the folder', () => {
  const result = filterTree(mockTree, 'tests');
  assert.equal(result.filteredRoot !== null, true);
  assert.equal(result.filteredRoot?.children.length, 1);
  assert.equal(result.filteredRoot?.children[0].name, 'tests');
  assert.equal(result.matchCount >= 1, true);
});

test('filterTree returns null filteredRoot if nothing matches', () => {
  const result = filterTree(mockTree, 'nonexistent_file_or_folder');
  assert.equal(result.filteredRoot, null);
  assert.equal(result.matchCount, 0);
});

test('filterTree is case-insensitive', () => {
  const result = filterTree(mockTree, 'readme');
  assert.equal(result.filteredRoot !== null, true);
  assert.equal(result.filteredRoot?.children.length, 1);
  assert.equal(result.filteredRoot?.children[0].name, 'README.md');
  assert.equal(result.matchCount, 1);
});
