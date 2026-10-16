import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectTreeJson } from './treeJsonExporter.ts';
import { WebTreeNode } from '../types/index.ts';

test('buildProjectTreeJson generates well-formed project JSON with correct statistics', () => {
  const mockTree: WebTreeNode = {
    id: 'root-1',
    name: 'MyAwesomeApp',
    path: 'MyAwesomeApp',
    isDir: true,
    enabled: true,
    children: [
      {
        id: 'child-1',
        name: 'src',
        path: 'MyAwesomeApp/src',
        isDir: true,
        enabled: true,
        children: [
          {
            id: 'child-1-1',
            name: 'main.py',
            path: 'MyAwesomeApp/src/main.py',
            isDir: false,
            enabled: true,
            children: [],
          },
          {
            id: 'child-1-2',
            name: 'utils.py',
            path: 'MyAwesomeApp/src/utils.py',
            isDir: false,
            enabled: false,
            children: [],
          },
        ],
      },
      {
        id: 'child-2',
        name: 'README.md',
        path: 'MyAwesomeApp/README.md',
        isDir: false,
        enabled: true,
        children: [],
      },
    ],
  };

  const result = buildProjectTreeJson(mockTree, {
    policy: 'overwrite',
    addInitPy: true,
    starterContent: true,
    treeText: 'MyAwesomeApp/\n  src/\n    main.py\n    utils.py\n  README.md',
    disabledNodePaths: ['MyAwesomeApp/src/utils.py'],
  });

  // Verify top-level structure
  assert.equal(result.schemaVersion, '1.0.0');
  assert.equal(result.generator, 'TreeForge');
  assert.equal(result.projectName, 'MyAwesomeApp');
  assert.equal(result.config.collisionPolicy, 'overwrite');
  assert.equal(result.config.addInitPy, true);
  assert.equal(result.config.starterContent, true);
  assert.deepEqual(result.config.disabledNodePaths, ['MyAwesomeApp/src/utils.py']);

  // Verify statistics
  assert.equal(result.stats.totalFolders, 2); // MyAwesomeApp, src
  assert.equal(result.stats.totalFiles, 3); // main.py, utils.py, README.md
  assert.equal(result.stats.totalNodes, 5);
  assert.equal(result.stats.enabledNodes, 4); // all except utils.py

  // Verify tree hierarchy
  assert.equal(result.tree.name, 'MyAwesomeApp');
  assert.equal(result.tree.isDir, true);
  assert.equal(result.tree.children?.length, 2);

  const srcFolder = result.tree.children?.[0];
  assert.equal(srcFolder?.name, 'src');
  assert.equal(srcFolder?.children?.length, 2);
  assert.equal(srcFolder?.children?.[0].name, 'main.py');
  assert.equal(srcFolder?.children?.[0].extension, '.py');
  assert.equal(srcFolder?.children?.[0].enabled, true);
  assert.equal(srcFolder?.children?.[1].name, 'utils.py');
  assert.equal(srcFolder?.children?.[1].enabled, false);

  // Starter content check for README.md
  const readmeNode = result.tree.children?.[1];
  assert.equal(readmeNode?.name, 'README.md');
  assert.equal(readmeNode?.extension, '.md');
  assert.match(readmeNode?.content || '', /# MyAwesomeApp/);

  // Flat nodes check
  assert.equal(result.flatNodes.length, 5);
  assert.equal(result.flatNodes[0].path, 'MyAwesomeApp');
  assert.equal(result.flatNodes[1].path, 'MyAwesomeApp/src');
});
